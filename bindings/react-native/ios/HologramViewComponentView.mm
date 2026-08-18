#import "HologramViewComponentView.h"

#ifdef RCT_NEW_ARCH_ENABLED

#import <react/renderer/components/RNHologramismSpec/ComponentDescriptors.h>
#import <react/renderer/components/RNHologramismSpec/EventEmitters.h>
#import <react/renderer/components/RNHologramismSpec/Props.h>
#import <react/renderer/components/RNHologramismSpec/RCTComponentViewHelpers.h>

/// The Swift half of this pod, which owns every HologramismKit call. Declared by
/// hand rather than imported: this is a C++ translation unit, so it can neither
/// `@import HologramismKit` nor include the pod's generated Swift header (that
/// header re-declares Swift/React types behind an `@import` of its own).
@interface HologramRNBridge : NSObject
+ (UIView *)makeView;
+ (void)setScene:(NSString *)json on:(UIView *)view;
+ (void)setTilt:(NSString *)json on:(UIView *)view;
@end

using namespace facebook::react;

@interface HologramViewComponentView () <RCTHologramViewViewProtocol>
@end

@implementation HologramViewComponentView {
  UIView *_hologram;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<HologramViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const HologramViewProps>();
    _props = defaultProps;

    _hologram = [HologramRNBridge makeView];
    self.contentView = _hologram;
  }
  return self;
}

// Both props arrive as JSON strings; see HologramViewNativeComponent.ts for why.
static NSString *RCTHologramString(const std::string &s)
{
  return s.empty() ? nil : [[NSString alloc] initWithUTF8String:s.c_str()];
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<const HologramViewProps>(_props);
  const auto &newViewProps = *std::static_pointer_cast<const HologramViewProps>(props);

  if (oldViewProps.scene != newViewProps.scene) {
    NSString *scene = RCTHologramString(newViewProps.scene);
    if (scene) {
      [HologramRNBridge setScene:scene on:_hologram];
    }
  }

  if (oldViewProps.tilt != newViewProps.tilt) {
    NSString *tilt = RCTHologramString(newViewProps.tilt);
    if (tilt) {
      [HologramRNBridge setTilt:tilt on:_hologram];
    }
  }

  [super updateProps:props oldProps:oldProps];
}

@end

#endif
