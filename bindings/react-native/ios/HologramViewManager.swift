import UIKit
import React

@objc(HologramViewManager)
public class HologramViewManager: RCTViewManager {
  public override func view() -> UIView! {
    return HologramView()
  }
  public override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
