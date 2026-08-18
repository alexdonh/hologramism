#ifdef RCT_NEW_ARCH_ENABLED

#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/// Fabric (new-architecture) host view for `HologramView`. The Paper twin is
/// `HologramViewManager`; both wrap the same `HologramismKit` view.
@interface HologramViewComponentView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END

#endif
