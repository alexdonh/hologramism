import Flutter
import UIKit

/// Registers the native platform view that backs the Dart `HologramView` widget.
public class HologramismPlugin: NSObject, FlutterPlugin {
  public static func register(with registrar: FlutterPluginRegistrar) {
    let factory = HologramViewFactory(messenger: registrar.messenger())
    registrar.register(factory, withId: "hologramism/HologramView")
  }
}
