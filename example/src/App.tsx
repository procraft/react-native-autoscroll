/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import { useContext, useState } from 'react';

import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  useAutoScrollAnim,
  type Offset,
  useAutoScrollHandler,
  AutoScrollContextRootProvider,
  AutoScrollScrollView,
  AutoScrollContext,
} from 'react-native-autoscroll';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

export default function App() {
  const [items] = useState(() =>
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      text: Array.from({ length: i })
        .map(() => i.toString())
        .join(' | '),
    }))
  );

  const isActive = useSharedValue(false);
  const scrollOffset = useSharedValue<Offset>({ x: 0, y: 0 });
  const scrollSpeed = useSharedValue(null);
  useAutoScrollAnim(isActive, scrollOffset, scrollSpeed, () => {
    'worklet';
  });

  useAutoScrollHandler(
    () => {},
    () => {},
    () => false
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AutoScrollContextRootProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.container}>
            <View>
              <Pressable>
                <Text>Start</Text>
              </Pressable>
            </View>
            <AutoScrollScrollView style={styles.scroll}>
              {items.map((item) => (
                <Item key={item.id} text={item.text} />
              ))}
            </AutoScrollScrollView>
          </View>
        </SafeAreaView>
      </AutoScrollContextRootProvider>
    </GestureHandlerRootView>
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
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
