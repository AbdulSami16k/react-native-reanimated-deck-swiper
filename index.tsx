import React, {
  forwardRef,
  ReactElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import {
  Dimensions,
  DimensionValue,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export enum SwipeDirection {
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  UP = "UP",
  DOWN = "DOWN",
}

export interface ISwiperRef {
  onRewindCard: () => void;
  onSwipeForcefully: (direction: SwipeDirection) => void;
}

export interface ISwiperProps<T = any> {
  width: DimensionValue;
  height: DimensionValue;
  dataList: T[];
  addionalData?: T[];
  loop?: boolean;
  tilt?: number;
  swipeVertical?: boolean;
  swipeHorizontal?: boolean;
  actionRight?: boolean;
  actionLeft?: boolean;
  actionUp?: boolean;
  actionDown?: boolean;
  cardScale?: number;
  rewindSpeed?: number;
  overlayLabels?: any;
  onGestureBegin?: () => void;
  onGestureEnd?: () => void;
  renderCard: (item: T, index: number, isTop: boolean) => ReactElement<T>;
  onSwipeUpdate?: (swipeDirection: SwipeDirection) => void;
  onSwipeReset?: (item: T, swipeDirection: SwipeDirection | null) => void;
  onSwipeComplete?: ({
    item,
    swipeDirection,
  }: {
    item: T;
    swipeDirection: SwipeDirection;
  }) => void;
}

interface ITopCardRef {
  onSwipeForcefully: (direction: SwipeDirection) => void;
}

interface ITopCardProps<T = any> {
  isTop: boolean;
  index: number;
  cardScale: number;
  rewindSpeed: number;
  isLast: boolean;
  item?: T;
  itemTilt: number;
  reverseDirection?: SwipeDirection | null;
  tilt?: number;
  swipeVertical?: boolean;
  swipeHorizontal?: boolean;
  actionRight?: boolean;
  actionLeft?: boolean;
  actionUp?: boolean;
  actionDown?: boolean;
  overlayLabels?: any;
  onGestureBegin?: () => void;
  onGestureEnd?: () => void;
  renderCard: (item: T, index: number, isTop: boolean) => ReactElement<T>;
  onSwipeOff?: (item: T, swipeDirection: SwipeDirection) => void;
  onSwipeUpdate?: (swipeDirection: SwipeDirection) => void;
  onSwipeReset?: (item: T, swipeDirection: SwipeDirection | null) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD_X = SCREEN_WIDTH * 0.3;
const SWIPE_THRESHOLD_Y = SCREEN_HEIGHT * 0.25;

// Stack visual constants — tune these to match original look
const STACK_OFFSET_Y = 12; // px downward per position (positive = cards peek from bottom)
const STACK_TILT = -8; // deg — odd-indexed cards are always tilted, even-indexed straight
const STACK_SIZE = 3; // matches original stackSize={3}

// Fast spring — advances smoothly without bouncing
const ADVANCE_SPRING = { damping: 20, stiffness: 200 };

const TopCard = forwardRef<ITopCardRef, ITopCardProps>(
  (
    {
      renderCard,
      isTop,
      isLast,
      item,
      index,
      itemTilt,
      tilt = 0,
      cardScale,
      rewindSpeed,
      reverseDirection,
      swipeVertical,
      swipeHorizontal,
      actionRight,
      actionLeft,
      actionUp,
      actionDown,
      overlayLabels,
      onGestureBegin,
      onGestureEnd,
      onSwipeOff = () => {},
      onSwipeUpdate = () => {},
      onSwipeReset = () => {},
    },
    ref,
  ) => {
    const visibleSV = useSharedValue(!isLast);

    const translateX = useSharedValue(
      reverseDirection === SwipeDirection.LEFT
        ? -SCREEN_WIDTH
        : reverseDirection === SwipeDirection.RIGHT
          ? SCREEN_WIDTH
          : 0,
    );
    const translateY = useSharedValue(
      reverseDirection === SwipeDirection.UP
        ? -SCREEN_HEIGHT
        : reverseDirection === SwipeDirection.DOWN
          ? SCREEN_HEIGHT
          : 0,
    );

    // rotate.value = drag-based rotation (only on top card during gesture)
    const rotate = useSharedValue(item?.rotation ?? 0);

    // Fixed tilt per card based on its original data index — never changes regardless of
    // which stack position the card occupies (odd-indexed cards always stay tilted).
    const stackRotation = useSharedValue(itemTilt);

    const scale = useSharedValue(isTop ? 1 : cardScale - (index - 1) * 0.02);

    // stackOffsetY moves background cards downward so they peek from behind the top card
    const stackOffsetY = useSharedValue(isTop ? 0 : index * STACK_OFFSET_Y);

    useImperativeHandle(ref, () => ({
      onSwipeForcefully(direction) {
        if (!isTop) return;
        onForceSwipe(direction);
      },
    }));

    useEffect(() => {
      visibleSV.value = !isLast;
    }, [isLast]);

    useLayoutEffect(() => {
      if (isTop && reverseDirection) {
        if (reverseDirection === SwipeDirection.LEFT)
          translateX.value = -SCREEN_WIDTH;
        if (reverseDirection === SwipeDirection.RIGHT)
          translateX.value = SCREEN_WIDTH;
        if (reverseDirection === SwipeDirection.UP)
          translateY.value = -SCREEN_HEIGHT;
        if (reverseDirection === SwipeDirection.DOWN)
          translateY.value = SCREEN_HEIGHT;

        translateX.value = withTiming(0, { duration: rewindSpeed });
        translateY.value = withTiming(0, { duration: rewindSpeed });
      }
    }, [reverseDirection, isTop]);

    // Runs when card advances in the stack (index changes) or becomes the top card.
    // index is in deps so non-top cards also update when they step up the stack.
    useEffect(() => {
      if (isTop) {
        scale.value = withSpring(1, ADVANCE_SPRING);
        // Smooth ease-out over 250 ms — matches the outgoing card's fly-off duration
        // so the card glides into position rather than jumping or popping.
        stackOffsetY.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.ease),
        });
      } else {
        scale.value = withSpring(
          cardScale - (index - 1) * 0.02,
          ADVANCE_SPRING,
        );
        stackOffsetY.value = withSpring(index * STACK_OFFSET_Y, ADVANCE_SPRING);
        translateX.value = 0;
        translateY.value = 0;
      }
      rotate.value = item?.rotation ?? 0;
    }, [isTop, index, reverseDirection]);

    const panGesture = Gesture.Pan()
      .enabled(isTop)
      // Lower activeOffsetY so RNGH commits before iOS ScrollView can steal the gesture.
      .activeOffsetX(
        swipeHorizontal ? [-10, 10] : [-SCREEN_WIDTH, SCREEN_WIDTH],
      )
      .activeOffsetY(swipeVertical ? [-8, 8] : [-SCREEN_HEIGHT, SCREEN_HEIGHT])
      .onBegin(() => {
        if (onGestureBegin) runOnJS(onGestureBegin)();
      })
      .onFinalize(() => {
        if (onGestureEnd) runOnJS(onGestureEnd)();
      })
      .onUpdate((event) => {
        if (swipeVertical) translateY.value = event.translationY;
        if (swipeHorizontal) {
          translateX.value = event.translationX;
          rotate.value = (item?.rotation ?? 0) + event.translationX / tilt;
        }
        if (translateX.value > SWIPE_THRESHOLD_X)
          runOnJS(onSwipeUpdate)(SwipeDirection.RIGHT);
        else if (translateX.value < -SWIPE_THRESHOLD_X)
          runOnJS(onSwipeUpdate)(SwipeDirection.LEFT);
        else if (translateY.value > SWIPE_THRESHOLD_Y)
          runOnJS(onSwipeUpdate)(SwipeDirection.DOWN);
        else if (translateY.value < -SWIPE_THRESHOLD_Y)
          runOnJS(onSwipeUpdate)(SwipeDirection.UP);
      })
      .onEnd(() => {
        let swiped = false;
        let swipeDirection = null;
        if (translateX.value > SWIPE_THRESHOLD_X && actionRight) {
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 });
          swiped = true;
          swipeDirection = SwipeDirection.RIGHT;
        } else if (translateX.value < -SWIPE_THRESHOLD_X && actionLeft) {
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 });
          swiped = true;
          swipeDirection = SwipeDirection.LEFT;
        } else if (translateY.value > SWIPE_THRESHOLD_Y && actionDown) {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
          swiped = true;
          swipeDirection = SwipeDirection.DOWN;
        } else if (translateY.value < -SWIPE_THRESHOLD_Y) {
          if (actionUp) {
            translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 250 });
            swiped = true;
          }
          swipeDirection = SwipeDirection.UP;
        }

        if (swiped && swipeDirection) {
          runOnJS(onSwipeOff)(item, swipeDirection);
        } else {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          rotate.value = withSpring(item?.rotation ?? 0);
          runOnJS(onSwipeReset)(item, swipeDirection);
        }
      });

    const onForceSwipe = (direction = SwipeDirection.RIGHT) => {
      let swiped = true;
      switch (direction.toUpperCase()) {
        case SwipeDirection.RIGHT:
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 });
          break;
        case SwipeDirection.LEFT:
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 });
          break;
        case SwipeDirection.UP:
          translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
          break;
        case SwipeDirection.DOWN:
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
          break;
        default:
          swiped = false;
      }
      if (swiped) {
        setTimeout(() => runOnJS(onSwipeOff)(item, direction), 250);
      }
    };

    // animateCardOpacity: card fades slightly (0.8) at drag extremes, matches original library
    const cardOpacity = useDerivedValue(() =>
      Math.min(
        interpolate(
          translateX.value,
          [
            -SCREEN_WIDTH / 2,
            -SCREEN_WIDTH / 3,
            0,
            SCREEN_WIDTH / 3,
            SCREEN_WIDTH / 2,
          ],
          [0.8, 1, 1, 1, 0.8],
          Extrapolation.CLAMP,
        ),
        interpolate(
          translateY.value,
          [
            -SCREEN_HEIGHT / 2,
            -SCREEN_HEIGHT / 3,
            0,
            SCREEN_HEIGHT / 3,
            SCREEN_HEIGHT / 2,
          ],
          [0.8, 1, 1, 1, 0.8],
          Extrapolation.CLAMP,
        ),
      ),
    );

    const rightOpacity = useDerivedValue(() =>
      Math.max(0, translateX.value / SWIPE_THRESHOLD_X),
    );
    const leftOpacity = useDerivedValue(() =>
      Math.max(0, -translateX.value / SWIPE_THRESHOLD_X),
    );
    const upOpacity = useDerivedValue(() =>
      Math.max(0, -translateY.value / SWIPE_THRESHOLD_Y),
    );
    const downOpacity = useDerivedValue(() =>
      Math.max(0, translateY.value / SWIPE_THRESHOLD_Y),
    );

    const rightAnimatedStyle = useAnimatedStyle(() => ({
      opacity: rightOpacity.value,
      zIndex: 100,
    }));
    const leftAnimatedStyle = useAnimatedStyle(() => ({
      opacity: leftOpacity.value,
      zIndex: 100,
    }));
    const upAnimatedStyle = useAnimatedStyle(() => ({
      opacity: upOpacity.value,
      zIndex: 100,
    }));
    const downAnimatedStyle = useAnimatedStyle(() => ({
      opacity: downOpacity.value,
      zIndex: 100,
    }));

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackOffsetY.value },
        { scale: scale.value },
        // rotate.value = drag rotation; stackRotation.value = fan tilt that animates to 0 on advance
        { rotate: `${rotate.value + stackRotation.value}deg` },
      ],
      opacity: visibleSV.value ? cardOpacity.value : 0,
      position: "absolute",
      width: "100%",
      height: "100%",
      zIndex: isTop ? 100 : 100 - index,
    }));

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          {renderCard(item, index, isTop)}

          {isTop && overlayLabels?.right && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                overlayLabels.right.style.wrapper,
                rightAnimatedStyle,
              ]}
              pointerEvents="none"
            >
              <Text style={overlayLabels.right.style.label}>
                {overlayLabels.right.title}
              </Text>
            </Animated.View>
          )}
          {isTop && overlayLabels?.left && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                overlayLabels.left.style.wrapper,
                leftAnimatedStyle,
              ]}
              pointerEvents="none"
            >
              <Text style={overlayLabels.left.style.label}>
                {overlayLabels.left.title}
              </Text>
            </Animated.View>
          )}
          {isTop && overlayLabels?.top && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                overlayLabels.top.style.wrapper,
                upAnimatedStyle,
              ]}
              pointerEvents="none"
            >
              <Text style={overlayLabels.top.style.label}>
                {overlayLabels.top.title}
              </Text>
            </Animated.View>
          )}
          {isTop && overlayLabels?.bottom && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                overlayLabels.bottom.style.wrapper,
                downAnimatedStyle,
              ]}
              pointerEvents="none"
            >
              <Text style={overlayLabels.bottom.style.label}>
                {overlayLabels.bottom.title}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </GestureDetector>
    );
  },
);

const Swiper = forwardRef<ISwiperRef, ISwiperProps>(
  (
    {
      dataList = [],
      addionalData,
      renderCard,
      loop = false,
      width,
      height,
      rewindSpeed = 250,
      tilt = 10,
      cardScale = 0.9,
      swipeVertical = true,
      swipeHorizontal = true,
      actionRight = true,
      actionLeft = true,
      actionUp = true,
      actionDown = true,
      overlayLabels,
      onGestureBegin,
      onGestureEnd,
      onSwipeComplete = () => {},
      onSwipeUpdate = () => {},
      onSwipeReset = () => {},
    },
    ref,
  ) => {
    const topCardRef = useRef<ITopCardRef>(null);
    const [data, setData] = React.useState(dataList);
    const [, setSwipeHistory] = React.useState<
      { item: any; swipeDirection: SwipeDirection }[]
    >([]);

    // useRef instead of module-level variable: safe across instances and remounts
    const reverseDirectionRef = useRef<SwipeDirection | null>(null);

    React.useEffect(() => {
      setData((prev) => {
        if (!prev || prev.length === 0) return prev;
        if (!loop) {
          setSwipeHistory((prevData) => {
            if (!prevData || prevData.length === 0) return prevData;
            return prevData.map((card) => {
              const updatedCard = dataList.find(
                (newItem) => newItem.id === card.item.id,
              );
              return updatedCard
                ? { item: updatedCard, swipeDirection: card.swipeDirection }
                : card;
            });
          });
        }
        return prev.map((card) => {
          const updatedCard = dataList.find(
            (newItem) => newItem.id === card.id,
          );
          return updatedCard ? updatedCard : card;
        });
      });
    }, [dataList]);

    React.useEffect(() => {
      if (addionalData) setData([...data, ...addionalData]);
    }, [addionalData]);

    useImperativeHandle(ref, () => ({
      onSwipeForcefully(direction = SwipeDirection.RIGHT) {
        if (topCardRef.current) topCardRef.current.onSwipeForcefully(direction);
      },
      onRewindCard() {
        onReverseCard();
      },
    }));

    const onSwipeOff = useCallback(
      (item: any, swipeDirection: SwipeDirection) => {
        reverseDirectionRef.current = null;
        if (loop) {
          setData((prev) => {
            if (prev.length === 0) return prev;
            const first = prev[0];
            const rest = prev.slice(1);
            return [...rest, first];
          });
        } else {
          setData((prev) => prev.slice(1));
        }
        const cardData = { item: item, swipeDirection: swipeDirection };
        onSwipeComplete(cardData);
        setSwipeHistory((prev) => [...prev, cardData]);
      },
      [loop, onSwipeComplete],
    );

    const onReverseCard = useCallback(() => {
      if (loop) {
        setSwipeHistory((prev) => {
          if (prev.length === 0) return prev;
          setData((prevData) => {
            if (prevData.length === 0) return prevData;
            const last = prevData[prevData.length - 1];
            const rest = prevData.slice(0, -1);
            return [last, ...rest];
          });
          reverseDirectionRef.current = prev[prev.length - 1].swipeDirection;
          return prev.slice(0, -1);
        });
      } else {
        setSwipeHistory((prev) => {
          if (prev.length === 0) return prev;
          const lastCard = prev[prev.length - 1];
          reverseDirectionRef.current = lastCard.swipeDirection;
          const newHistory = prev.slice(0, -1);
          setData((current) => [lastCard.item, ...current]);
          return newHistory;
        });
      }
    }, [loop]);

    return (
      <View style={{ width: width, height: height, alignItems: "center" }}>
        {data
          .slice(0, STACK_SIZE)
          .map((item, index) => {
            const isTop = index === 0;
            // Tilt is a fixed property of each card based on its position in the
            // original dataList — odd-indexed cards are always tilted, even-indexed
            // are always straight, regardless of which slot they currently occupy.
            const originalIndex = dataList.findIndex((d) => d.id === item.id);
            const itemTilt = originalIndex % 2 !== 0 ? STACK_TILT : 0;
            return (
              <View
                key={item.id || index.toString()}
                style={[StyleSheet.absoluteFill]}
              >
                <TopCard
                  ref={isTop ? topCardRef : null}
                  renderCard={renderCard}
                  isTop={isTop}
                  isLast={index === data.length - 1 && data.length > 2}
                  item={item}
                  index={index}
                  itemTilt={itemTilt}
                  tilt={tilt}
                  cardScale={cardScale}
                  rewindSpeed={rewindSpeed}
                  reverseDirection={isTop ? reverseDirectionRef.current : null}
                  onSwipeOff={onSwipeOff}
                  swipeVertical={swipeVertical}
                  swipeHorizontal={swipeHorizontal}
                  actionRight={actionRight}
                  actionLeft={actionLeft}
                  actionUp={actionUp}
                  actionDown={actionDown}
                  overlayLabels={overlayLabels}
                  onGestureBegin={isTop ? onGestureBegin : undefined}
                  onGestureEnd={isTop ? onGestureEnd : undefined}
                  onSwipeUpdate={onSwipeUpdate}
                  onSwipeReset={onSwipeReset}
                />
              </View>
            );
          })
          .reverse()}
      </View>
    );
  },
);

export default Swiper;
