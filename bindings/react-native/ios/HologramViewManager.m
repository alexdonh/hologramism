#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>

// Bridges the Swift view manager + exposes view props to JS (Paper / classic
// architecture). Content is the canonical scene schema, JSON-encoded; `tilt`
// groups the orientation/interaction toggles, likewise JSON. Both are remapped
// onto the `setSceneJson:` / `setTiltJson:` setters added in Swift.
@interface RCT_EXTERN_MODULE(HologramViewManager, RCTViewManager)

RCT_REMAP_VIEW_PROPERTY(scene, sceneJson, NSString)
RCT_REMAP_VIEW_PROPERTY(tilt, tiltJson, NSString)

@end
