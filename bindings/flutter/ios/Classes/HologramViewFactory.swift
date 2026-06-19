import Flutter
import UIKit
import HologramismKit

/// Builds `HologramPlatformView`s for the `hologramism/HologramView` view type,
/// decoding scene/tilt from the StandardMessageCodec creation params.
class HologramViewFactory: NSObject, FlutterPlatformViewFactory {
  private let messenger: FlutterBinaryMessenger

  init(messenger: FlutterBinaryMessenger) {
    self.messenger = messenger
    super.init()
  }

  func createArgsCodec() -> FlutterMessageCodec & NSObjectProtocol {
    FlutterStandardMessageCodec.sharedInstance()
  }

  func create(withFrame frame: CGRect, viewIdentifier viewId: Int64, arguments args: Any?) -> FlutterPlatformView {
    HologramPlatformView(frame: frame, viewId: viewId, args: args, messenger: messenger)
  }
}

/// Wraps the shared `Hologramism.HologramView`. `UiKitView` sets creation params
/// once, so a per-view method channel (`hologramism/HologramView/<id>`) carries
/// later scene/tilt updates when the Dart widget rebuilds.
class HologramPlatformView: NSObject, FlutterPlatformView {
  private let hologram = HologramView()
  private let channel: FlutterMethodChannel

  init(frame: CGRect, viewId: Int64, args: Any?, messenger: FlutterBinaryMessenger) {
    channel = FlutterMethodChannel(
      name: "hologramism/HologramView/\(viewId)", binaryMessenger: messenger)
    super.init()

    hologram.frame = frame
    apply(args)

    channel.setMethodCallHandler { [weak self] call, result in
      guard let self = self else { return }
      switch call.method {
      case "setScene":
        if let dict = call.arguments as? NSDictionary { self.hologram.setScene(dict) }
        result(nil)
      case "setTilt":
        if let dict = call.arguments as? NSDictionary { self.hologram.setTilt(dict) }
        result(nil)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private func apply(_ args: Any?) {
    guard let params = args as? [String: Any] else { return }
    if let tilt = params["tilt"] as? NSDictionary { hologram.setTilt(tilt) }
    if let scene = params["scene"] as? NSDictionary { hologram.setScene(scene) }
  }

  func view() -> UIView { hologram }
}
