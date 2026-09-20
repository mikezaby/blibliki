# Instrument Wizard Design

Status: agreed 2026-09-20, not implemented.

## Why

`apps/instruments` can pick an instrument and play it. It cannot make one.
Creation only exists in grid, where "Create Instrument" produces the default
document: seven tracks with an `unassigned` source and a master track. That
instrument is silent until someone opens grid's editor and assigns sources.
A visitor to play.blibliki.com has no path from "I want to play something"
to sound.

The wizard gives the app its own way to create instruments. It has to work
for three people at once: a visitor with no controller who wants sound
within a minute, a Launch Control XL3 owner setting up a rig, and someone
who wants to choose every track.

## What the model allows

The choice space is smaller than it looks. There is one template (8 tracks,
3 fixed pages) and one hardware profile. The track chain is fixed: source,
amp, filter, lfo, four fx, gain. Per track the real choices are the source
profile (`osc`, `wavetable`, `noise`, `threeOsc`, `drumMachine`), four fx
slots out of five effects, whether it has a step sequencer, MIDI channel,
voices, and routing. Plus the name.

So the wizard does not walk the document's fields. Eight tracks times six
fields is a form. It asks for intent first and lets the user adjust after.

## Flow

A full page at `/new`, not a Dialog over the picker. It needs room on a
phone, the back button should work, and it has to stay mounted while the
Clerk sign-in modal is open. State is one `useState` in the route: step,
recipe id, working document, name. No store. The step indicator is a plain
"Step 2 of 3" line, so `@blibliki/ui` gets no new primitive.

1. **Recipe.** One card per recipe: title, one-line description, and a
   summary derived from the document ("drums · bass · 2 synths"). Two
   actions per card, **Try** and **Use this**.
2. **Fine-tune.** The structure editor described below, with a prominent
   **Skip**.
3. **Name and create.** Signed out, this opens the Clerk modal first. Then
   `new Instrument({ name, userId, document }).save()` and navigate to
   `/instrument/<id>`, so the user lands in the console.

The picker gets a "New instrument" button.

A "select your MIDI controller" step will go in front of step 1 once a
second controller exists. It is not built now, because a screen with one
option is noise. The document already has `hardwareProfileId`, so the step
only has to write it. Recipes must not depend on anything specific to the
Launch Control XL3, or that step stops being a one-screen addition.

## Try before sign-in

Every instrument in the app is addressed by a Firestore id. The console
loader calls `Instrument.find(id)` and device drafts are keyed by that id,
so there is nowhere to put an instrument that exists only on a device.
Building that (a local id space, a merged picker, a claim-on-sign-in
upload) is a second storage backend and is not part of this work.

Instead, recipes are playable as they are. **Try** opens
`/instrument/recipe.<id>`, and the loader gets one branch: ids starting
with `recipe.` resolve from the package instead of Firestore. A recipe has
no owner, so `persistInstrument` already does the right thing: tweaks are
saved as a device draft and nothing reaches Firestore.

On a recipe the console shows **Make it mine**, which links to
`/new?recipe=<id>`. The wizard opens at step 2 and starts from the
visitor's device draft of that recipe when there is one, because
`resolveInstrumentDocument` already prefers the draft. A visitor can tune a
recipe by ear and keep the result. Sign-in is only asked for at step 3.

This is also how recipes get auditioned, without running a second engine
inside the wizard.

## The structure editor

`InstrumentStructureEditor` takes `document` and `onChange(document)` and
nothing else. It does not know it is inside a wizard, so the same screen
can be opened on an existing instrument later. It lives in
`apps/instruments` until grid or mobile wants it, then moves to
`@blibliki/instrument/react`.

A vertical list, one row per track, master last. Collapsed, a row is a
one-line summary (`2 · Bass · Three osc · sequencer · ch 2 · dist → delay`)
with an on/off switch. Tapping a row opens it. One row is open at a time,
which keeps the screen short on a phone.

Inside an open row, top to bottom:

1. Name
2. Sound source
3. Step sequencer, a switch. Every note track takes external MIDI on its
   channel, and a sequencer track feeds its sequencer into the same voice
   scheduler, so this is "has a sequencer", not a choice between two inputs.
4. Effects, four selects in signal order
5. An "Advanced" fold: MIDI channel, voices, and routing (internal, or fed
   from another track in serial or parallel mode)

The options, the defaults and the hiding rule match grid's editor: a track
fed from another track hides source, channel and voices, because it only
processes incoming audio. The master row shows its four effects only.

Labels say what a choice does ("Fed from track 3"), not the field name.
Everything is built from `Card`, `Stack`, `Switch`, `Input`, `Label` and
`OptionSelect`.

Changing a source is safe. The compiler skips saved slot values whose block
or slot no longer exists (`createTrackFromDocument.ts`), so the old values
go inert instead of breaking the instrument.

Depth stops at structure on purpose. Sound parameters already have an
editor: the console rebuilds a saved document from the running patch and
hands it to `onPersist`, and you can hear what you are changing there.
Improving that edit-and-save loop in performance mode is the task after
this one. Not in the editor: adding or removing tracks (the template fixes
them at 8, users turn tracks off), reordering, tempo and swing, step
editing, macro mapping.

## Recipes

A recipe is `{ id, title, description, document }`. No tag until there are
enough recipes to need a filter. Each is one file in
`packages/instrument/src/recipes/` holding the document as saved, exported
through `instrumentRecipes` and `findInstrumentRecipe(id)`, and run through
`migrateInstrumentDocument` when read so an old recipe still opens after
the document version moves.

Recipes are documents, not builder functions, because a recipe is only as
good as its sound and its pattern, and those are made by ear. The authoring
loop is: build it in the app, tune it, save, copy the document into the
package. The console already keeps the working document in localStorage
under `blibliki.instrument.<id>`, so no export feature is needed.

Shipping them in the package costs a deploy per recipe. In return the
first screen of the wizard has no loading state and no failure mode, the
recipes are versioned with the model they depend on, and grid and mobile
get them for nothing. Moving them to Firestore later (publish as recipe,
community recipes) stays open, since a recipe is already just a document.

Day one:

1. **Groovebox.** Drum machine, bass and lead, all on the sequencer with
   patterns. First in the list because it makes sound on play with no
   keyboard and no controller.
2. **Drum kit.** Drum machine on the sequencer.
3. **Poly synth.** One playable three-osc track with chorus and reverb,
   the rest off.
4. **Blank.** Today's default document.

The first versions are placeholders with sensible values and simple
patterns, written so the wizard works end to end. They are meant to be
replaced with versions tuned by ear. Because nobody tuned them, they are
not pasted documents: each is the default document plus what differs,
written with `createRecipeDocument` and step lanes like
`{ C1: "x...x...x...x..." }`. A recipe tuned by ear replaces that with the
saved document.

## Shared reducers

The structure editor needs the pure document reducers that live in
`apps/grid/src/instruments/editorState.ts` (`updateTrackDocument`,
`updateTrackFxChain`, `selectTrackAudioSource` and the rest). They move
into `packages/instrument` with their test, in their own commit, and grid
imports them from there.

## Failure cases

A failed save at step 3 keeps the wizard on step 3 with its state and
shows the error. An unknown `?recipe=` falls back to step 1. An unknown
`recipe.<id>` in the console route fails the same way a missing Firestore
id does.

## Testing

Package: every recipe migrates and compiles through
`createInstrumentEnginePatch` without throwing, ids are unique, and every
recipe except Blank has at least one enabled track with a real source.
This is the test that catches a model change breaking a recipe.

App, in the style of the existing `persistInstrument` tests: recipe ids
resolve in the loader and unknown ones fail, and the wizard's starting
document prefers a device draft over the recipe.

## Order of work

One commit each, reviewed before the next starts.

1. Move the reducers into the package, grid imports them.
2. Recipes and their test.
3. The `recipe.*` loader branch and "Make it mine".
4. The `/new` wizard and the picker button.
