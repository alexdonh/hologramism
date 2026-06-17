#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>

// Bridges the Swift view manager + exposes view props to JS (Paper / classic
// architecture). Content is one serializable `scene` dict (mirrors the Rust
// scene schema); `tilt` groups the orientation/interaction toggles.
@interface RCT_EXTERN_MODULE(HologramViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(scene, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(tilt, NSDictionary)

@end
