import Capacitor
import UIKit

// App-local plugins have to be registered by hand; only packaged plugins are
// discovered automatically.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(BliblikiMidiPlugin())
    }
}
