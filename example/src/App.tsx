/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import { useCallback, useContext, useMemo, useState } from 'react';

import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  AutoScrollContext,
  AutoScrollContextRootProvider,
  AutoScrollScrollView,
} from '@procraft/react-native-autoscroll';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  measure,
  runOnJS,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

export default function App() {
  const [items] = useState(() =>
    Array.from({ length: 50 }).map((_, i) => ({
      id: i + 1,
      text: Array.from({ length: i + 1 })
        .map(() => (i + 1).toString())
        .join(' | '),
    }))
  );

  const [manualActivate, setManualActivate] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number | null>(100);

  const setScroll = useCallback((speed: number | null) => {
    setScrollSpeed(speed);
    setManualActivate(speed != null);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AutoScrollContextRootProvider>
        <SafeAreaView
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={styles.container}>
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: 8,
              }}
            >
              <Pressable style={styles.button} onPress={() => setScroll(100)}>
                <Text>Scroll To Bottom</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => setScroll(-100)}>
                <Text>Scroll To Top</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => setScroll(null)}>
                <Text>Stop Scroll</Text>
              </Pressable>
            </View>
            <AutoScrollScrollView
              style={styles.scroll}
              manualActivate={manualActivate}
              manualScrollBy={scrollSpeed}
            >
              {items.map((item) => (
                <ItemMemo key={item.id} text={item.text} />
              ))}
            </AutoScrollScrollView>
          </View>
          <MovedItem setScroll={setScroll} />
        </SafeAreaView>
      </AutoScrollContextRootProvider>
    </GestureHandlerRootView>
  );
}

interface MovedItemProps {
  setScroll: (speed: number | null) => void;
}

function MovedItem(props: MovedItemProps) {
  const { setScroll } = props;

  const { startScroll, stopScroll } = useContext(AutoScrollContext);

  const animatedRef = useAnimatedRef();
  const transition = useSharedValue({ x: 0, y: 0 });

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          runOnJS(setScroll)(null);
        })
        .onChange(({ changeX, changeY }) => {
          transition.value = {
            x: transition.value.x + changeX,
            y: transition.value.y + changeY,
          };

          const measurement = measure(animatedRef);
          if (measurement != null) {
            startScroll({ measurement });
          }
        })
        .onEnd(() => {
          stopScroll();
        }),
    [animatedRef, transition, setScroll, startScroll, stopScroll]
  );

  const style = useAnimatedStyle(
    () => ({
      transform: [
        { translateX: transition.value.x },
        { translateY: transition.value.y },
      ],
    }),
    []
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={animatedRef}
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            backgroundColor: 'red',
            justifyContent: 'center',
            alignItems: 'center',
          },
          style,
        ]}
      >
        <Text style={{ position: 'absolute', fontSize: 28, right: 10 }}>⮕</Text>
        <Text
          style={{
            position: 'absolute',
            fontSize: 28,
            left: 10,
            transform: [{ rotate: '180deg' }],
          }}
        >
          ⮕
        </Text>
        <Text
          style={{
            position: 'absolute',
            fontSize: 28,
            bottom: 10,
            transform: [{ rotate: '90deg' }],
          }}
        >
          ⮕
        </Text>
        <Text
          style={{
            position: 'absolute',
            fontSize: 28,
            top: 10,
            transform: [{ rotate: '270deg' }],
          }}
        >
          ⮕
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

interface ItemProps {
  text: string;
}

function Item(props: ItemProps) {
  const { text } = props;

  const { id, startScroll } = useContext(AutoScrollContext);

  return (
    <View
      style={{
        borderRadius: 4,
        borderWidth: 1,
        marginVertical: 4,
        padding: 4,
      }}
    >
      <Pressable
        onPress={() => {
          if (id != null) {
            startScroll({ id, speed: 40 });
          }
        }}
      >
        <Text>{text}</Text>
      </Pressable>
    </View>
  );
}

const ItemMemo = React.memo(Item);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 60,
  },
  scroll: {
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  button: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
