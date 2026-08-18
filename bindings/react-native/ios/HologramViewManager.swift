import UIKit
import React
import HologramismKit

/// Paper (classic-architecture) view manager. Its new-architecture twin is
/// `HologramViewComponentView.mm`; both drive the same `HologramView` from
/// `HologramismKit` and both take the scene as JSON, so the two paths cannot
/// drift in what they accept.
@objc(HologramViewManager)
public class HologramViewManager: RCTViewManager {
  public override func view() -> UIView! {
    return HologramView()
  }
  public override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

/// The JSON-string prop setters the view manager exports. `HologramView` itself
/// takes dictionaries -- the string is what crosses the bridge, because the
/// scene schema is too dynamic for the new architecture's codegen to type.
extension HologramView {
  @objc public func setSceneJson(_ json: NSString) {
    guard let dict = HologramViewManager.parseJSON(json) else { return }
    setScene(dict)
  }

  @objc public func setTiltJson(_ json: NSString) {
    guard let dict = HologramViewManager.parseJSON(json) else { return }
    setTilt(dict)
  }
}

/// ObjC-visible entry point for the Fabric component view. That file is ObjC++,
/// and a C++ translation unit cannot `@import HologramismKit`, so the Swift half
/// of this pod hands it the view and the prop setters instead.
@objc(HologramRNBridge)
public class HologramRNBridge: NSObject {
  @objc public static func makeView() -> UIView {
    return HologramView()
  }

  @objc public static func setScene(_ json: NSString, on view: UIView) {
    (view as? HologramView)?.setSceneJson(json)
  }

  @objc public static func setTilt(_ json: NSString, on view: UIView) {
    (view as? HologramView)?.setTiltJson(json)
  }
}

extension HologramViewManager {
  static func parseJSON(_ json: NSString) -> NSDictionary? {
    guard let data = (json as String).data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? NSDictionary
    else { return nil }
    return obj
  }
}
