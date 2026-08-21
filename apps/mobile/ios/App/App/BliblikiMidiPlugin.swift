import Capacitor
import CoreMIDI
import Foundation

// CoreMIDI bridge for the WebView: WebKit has no Web MIDI API, so the engine's
// MIDI adapter is fed from here instead. Raw MIDI 1.0 bytes both ways —
// sysex included, which the community plugins do not carry.
//
// ponytail: app-local plugin. Move to packages/capacitor-midi when grid or
// Android needs it; the CoreMIDI code moves unchanged.
@objc(BliblikiMidiPlugin)
public class BliblikiMidiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BliblikiMidiPlugin"
    public let jsName = "BliblikiMidi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "listPorts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "send", returnType: CAPPluginReturnPromise)
    ]

    private var client = MIDIClientRef()
    private var inputPort = MIDIPortRef()
    private var outputPort = MIDIPortRef()
    private var connected: [MIDIUniqueID: MIDIEndpointRef] = [:]
    private var refCons: [MIDIUniqueID: UnsafeMutablePointer<MIDIUniqueID>] = [:]
    private var parsers: [MIDIUniqueID: MidiStreamParser] = [:]

    override public func load() {
        let created = MIDIClientCreateWithBlock("Blibliki" as CFString, &client) { [weak self] notification in
            guard notification.pointee.messageID == .msgSetupChanged else { return }
            DispatchQueue.main.async {
                self?.connectSources()
                self?.notifyListeners("portsChanged", data: [:])
            }
        }
        guard created == noErr else {
            CAPLog.print("BliblikiMidi: could not create a CoreMIDI client")
            return
        }

        MIDIInputPortCreateWithBlock(client, "Blibliki in" as CFString, &inputPort) { [weak self] packetList, srcConnRefCon in
            guard let self, let refCon = srcConnRefCon else { return }
            let uniqueID = refCon.assumingMemoryBound(to: MIDIUniqueID.self).pointee
            self.receive(packetList: packetList, from: uniqueID)
        }
        MIDIOutputPortCreate(client, "Blibliki out" as CFString, &outputPort)

        connectSources()
    }

    // MARK: - JS API

    @objc func listPorts(_ call: CAPPluginCall) {
        call.resolve([
            "inputs": endpoints(MIDIGetNumberOfSources, MIDIGetSource).map(describe),
            "outputs": endpoints(MIDIGetNumberOfDestinations, MIDIGetDestination).map(describe)
        ])
    }

    @objc func send(_ call: CAPPluginCall) {
        guard let portId = call.getString("portId"), let uniqueID = MIDIUniqueID(portId) else {
            call.reject("portId is required")
            return
        }

        let bytes: [UInt8] = (call.getArray("data") ?? []).compactMap { value in
            guard let number = value as? NSNumber else { return nil }
            return UInt8(truncatingIfNeeded: number.intValue)
        }
        guard !bytes.isEmpty else {
            call.reject("data is required")
            return
        }

        let destinations = endpoints(MIDIGetNumberOfDestinations, MIDIGetDestination)
        guard let destination = destinations.first(where: { self.uniqueID(of: $0) == uniqueID }) else {
            call.reject("unknown output port \(portId)")
            return
        }

        // ponytail: one MIDIPacketList per call, so a sysex dump has to fit in a
        // single packet list (~64KB). Switch to MIDISendSysex if a device ever
        // needs a bigger transfer.
        let size = MemoryLayout<MIDIPacketList>.size + bytes.count
        let raw = UnsafeMutableRawPointer.allocate(
            byteCount: size,
            alignment: MemoryLayout<MIDIPacketList>.alignment
        )
        defer { raw.deallocate() }

        let packetList = raw.bindMemory(to: MIDIPacketList.self, capacity: 1)
        let first = MIDIPacketListInit(packetList)
        guard MIDIPacketListAdd(packetList, size, first, 0, bytes.count, bytes) != nil else {
            call.reject("message too large for one packet list")
            return
        }

        let status = MIDISend(outputPort, destination, packetList)
        guard status == noErr else {
            call.reject("MIDISend failed with \(status)")
            return
        }
        call.resolve()
    }

    // MARK: - Incoming

    private func receive(packetList: UnsafePointer<MIDIPacketList>, from uniqueID: MIDIUniqueID) {
        let parser = parsers[uniqueID] ?? {
            let created = MidiStreamParser()
            parsers[uniqueID] = created
            return created
        }()

        var packet = packetList.pointee.packet
        for _ in 0..<packetList.pointee.numPackets {
            let length = Int(packet.length)
            let bytes = withUnsafeBytes(of: packet.data) { Array($0.prefix(length)) }
            parser.push(bytes) { [weak self] message in
                self?.emit(message, from: uniqueID)
            }
            packet = MIDIPacketNext(&packet).pointee
        }
    }

    // ponytail: hops to the main queue before crossing the bridge, which costs a
    // millisecond or so of jitter. The WebView's own audio latency dwarfs it;
    // revisit only if MIDI timing becomes the bottleneck.
    private func emit(_ message: [UInt8], from uniqueID: MIDIUniqueID) {
        let payload: [String: Any] = [
            "portId": String(uniqueID),
            "data": message.map { Int($0) }
        ]
        DispatchQueue.main.async {
            self.notifyListeners("midiMessage", data: payload)
        }
    }

    // MARK: - Endpoints

    private func connectSources() {
        let sources = endpoints(MIDIGetNumberOfSources, MIDIGetSource)
        let current = Set(sources.map(uniqueID(of:)))

        for source in sources {
            let id = uniqueID(of: source)
            guard connected[id] == nil else { continue }

            let refCon = UnsafeMutablePointer<MIDIUniqueID>.allocate(capacity: 1)
            refCon.initialize(to: id)
            guard MIDIPortConnectSource(inputPort, source, refCon) == noErr else {
                refCon.deallocate()
                continue
            }
            connected[id] = source
            refCons[id] = refCon
        }

        for (id, endpoint) in connected where !current.contains(id) {
            MIDIPortDisconnectSource(inputPort, endpoint)
            refCons[id]?.deallocate()
            refCons[id] = nil
            connected[id] = nil
            parsers[id] = nil
        }
    }

    private func endpoints(
        _ count: () -> Int,
        _ at: (Int) -> MIDIEndpointRef
    ) -> [MIDIEndpointRef] {
        (0..<count()).map(at)
    }

    private func describe(_ endpoint: MIDIEndpointRef) -> [String: String] {
        ["id": String(uniqueID(of: endpoint)), "name": name(of: endpoint)]
    }

    private func uniqueID(of endpoint: MIDIEndpointRef) -> MIDIUniqueID {
        var id: MIDIUniqueID = 0
        MIDIObjectGetIntegerProperty(endpoint, kMIDIPropertyUniqueID, &id)
        return id
    }

    private func name(of endpoint: MIDIEndpointRef) -> String {
        var value: Unmanaged<CFString>?
        let status = MIDIObjectGetStringProperty(endpoint, kMIDIPropertyDisplayName, &value)
        guard status == noErr, let name = value?.takeRetainedValue() else {
            return "MIDI \(uniqueID(of: endpoint))"
        }
        return name as String
    }
}
