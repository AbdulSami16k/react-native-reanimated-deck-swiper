# react-native-reanimated-deck-swiper

[![npm version](https://img.shields.io/npm/v/react-native-reanimated-deck-swiper.svg)](https://www.npmjs.com/package/react-native-reanimated-deck-swiper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, **Fabric (New Architecture) compatible**, drop-in replacement for legacy deck swipers. Built entirely from scratch using `react-native-reanimated` v3 and `react-native-gesture-handler` for buttery smooth 60 FPS animations running entirely on the Native UI thread.

**[➡️ Click here to watch the Performance Demo Video](https://player.cloudinary.com/embed/?cloud_name=dxvco4okv&public_id=demo_d1edlh)**

---

## ⚡ The Problem with Legacy Swipers

Popular legacy libraries like `react-native-deck-swiper` rely on the old `PanResponder` API. Under React Native's New Architecture, asynchronous state thrashing over the legacy bridge causes heavy visual flickering, dropped frames, and component jumping.

---

## 🚀 The Solution

This library calculates all gesture events and drives animations entirely on the **Native UI Thread** using shared values, completely eliminating old bridge bottlenecks.

- **Zero Flickering:** 100% compatible with the synchronous Fabric layout engine.
- **Buttery Smooth:** 60 FPS performance tracking via Reanimated reactive animations.
- **Drop-in Support:** Clean layout matching legacy prop standards for seamless migration.
- **Custom Overlays:** Native styling support for dynamic directional overlay elements (`left`, `right`, `top`, `bottom`).

---

## 📦 Installation

```bash
npm install react-native-reanimated-deck-swiper
```

Make sure `react-native-reanimated` and `react-native-gesture-handler` are installed and configured in your root project.

---

## 💻 Usage Example

```tsx
import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Swiper from "react-native-reanimated-deck-swiper";

const DATA = [
  { id: "1", title: "Fighter 1", discipline: "Karate" },
  { id: "2", title: "Fighter 2", discipline: "BJJ" },
  { id: "3", title: "Fighter 3", discipline: "Muay Thai" },
];

export default function DeckView() {
  const [list] = useState(DATA);

  return (
    <View style={styles.container}>
      <Swiper
        dataList={list}
        width="100%"
        height={540}
        loop={true}
        swipeVertical={true}
        swipeHorizontal={true}
        cardScale={0.98}
        overlayLabels={{
          left: {
            title: "DODGE",
            style: {
              label: {
                borderColor: "#EA333E",
                color: "#EA333E",
                borderWidth: 3,
                fontSize: 30,
                fontWeight: "bold",
              },
              wrapper: {
                alignItems: "flex-end",
                marginTop: 30,
                marginLeft: -30,
              },
            },
          },
          right: {
            title: "WATCHLIST",
            style: {
              label: {
                borderColor: "#D08002",
                color: "#D08002",
                borderWidth: 3,
                fontSize: 30,
                fontWeight: "bold",
              },
              wrapper: {
                alignItems: "flex-start",
                marginTop: 30,
                marginLeft: 30,
              },
            },
          },
        }}
        onSwipeComplete={({ item, swipeDirection }) => {
          console.log(`Card ${item.title} swiped ${swipeDirection}`);
        }}
        renderCard={(cardItem, index, isTop) => (
          <View style={styles.card}>
            <Text style={styles.title}>{cardItem.title}</Text>
            <Text style={styles.subtitle}>{cardItem.discipline}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  card: {
    flex: 1,
    borderRadius: 15,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 18,
    color: "gray",
    marginTop: 5,
  },
});
```

---

## ⚙️ Props

| Prop              | Type             | Required | Default | Description                                                                                                    |
| :---------------- | :--------------- | :------: | :------ | :------------------------------------------------------------------------------------------------------------- |
| `dataList`        | `Array<T>`       | **Yes**  | `[]`    | Internal data list for mapping stack cards. Items require a unique `id`.                                       |
| `renderCard`      | `function`       | **Yes**  | -       | Render mapping function. Receives arguments `(item: T, index: number, isTop: boolean)`.                        |
| `width`           | `DimensionValue` | **Yes**  | -       | Total width of target swiper card layout wrapper.                                                              |
| `height`          | `DimensionValue` | **Yes**  | -       | Total height of target swiper card layout wrapper.                                                             |
| `addionalData`    | `Array<T>`       |    No    | -       | Appends incoming data blocks smoothly to baseline deck stack array.                                            |
| `loop`            | `boolean`        |    No    | `false` | When true, automatically cycles dismissed cards back to the end of the stack deck array.                       |
| `cardScale`       | `number`         |    No    | `0.9`   | Baseline sizing modifier index layer down on lower stacked structural cards.                                   |
| `tilt`            | `number`         |    No    | `10`    | Physics interpolation ratio mapping tracking velocity offset tilt factor.                                      |
| `rewindSpeed`     | `number`         |    No    | `250`   | Structural layout execution window animation runtime length for snap-backs or card rewinding.                  |
| `swipeHorizontal` | `boolean`        |    No    | `true`  | Explicit structural lock selector switch setting for tracking horizontal inputs.                               |
| `swipeVertical`   | `boolean`        |    No    | `true`  | Explicit structural lock selector switch setting for tracking vertical inputs.                                 |
| `actionRight`     | `boolean`        |    No    | `true`  | Enables/Disables dismissal execution handler routes targeting the right threshold point.                       |
| `actionLeft`      | `boolean`        |    No    | `true`  | Enables/Disables dismissal execution handler routes targeting the left threshold point.                        |
| `actionUp`        | `boolean`        |    No    | `true`  | Enables/Disables dismissal execution handler routes targeting the upper threshold point.                       |
| `actionDown`      | `boolean`        |    No    | `true`  | Enables/Disables dismissal execution handler routes targeting the lower threshold point.                       |
| `overlayLabels`   | `object`         |    No    | -       | Configuration stylesheet map dictating dynamic fading context layout indicator typography structures.          |
| `onGestureBegin`  | `function`       |    No    | -       | Callback execution event running when immediate hardware user surface touch interaction fires.                 |
| `onGestureEnd`    | `function`       |    No    | -       | Callback execution event running immediately when active contact interaction drops.                            |
| `onSwipeUpdate`   | `function`       |    No    | -       | Callback firing actively as coordinate points transition over the drag sequence boundaries.                    |
| `onSwipeReset`    | `function`       |    No    | -       | Executed state trigger routine fires if drag motions abort and cards snap back to layout resting point.        |
| `onSwipeComplete` | `function`       |    No    | -       | Main payload exit handler execution tracking complete structural sweeps. Returns `({ item, swipeDirection })`. |

---

## 🕹️ Exposed Ref Methods

By attaching a standard React `ref` parameter, you can execute physical stack updates programmatically:

| Method              | Signature                             | Description                                                                            |
| :------------------ | :------------------------------------ | :------------------------------------------------------------------------------------- |
| `onSwipeForcefully` | `(direction: SwipeDirection) => void` | Programmatically launches structural layout card sweeps along selected direction maps. |
| `onRewindCard`      | `() => void`                          | Rewinds history arrays pulling last swiped instance back onto stack layers.            |

```tsx
const swiperRef = useRef(null);

swiperRef.current?.onSwipeForcefully("left");

swiperRef.current?.onRewindCard();
```
