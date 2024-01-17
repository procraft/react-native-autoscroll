/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import { useContext, useState } from 'react';

import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  AutoScrollContext,
  AutoScrollContextRootProvider,
  AutoScrollScrollView,
} from 'react-native-autoscroll';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [items] = useState(() =>
    Array.from({ length: 50 }).map((_, i) => ({
      id: i + 1,
      text: Array.from({ length: i + 1 })
        .map(() => (i + 1).toString())
        .join(' | '),
    }))
  );

  const [scrollOffset, setScrollOffset] = useState<number | null>(100);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AutoScrollContextRootProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.container}>
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: 8,
              }}
            >
              <Pressable
                style={styles.button}
                onPress={() => setScrollOffset(100)}
              >
                <Text>Scroll To Bottom</Text>
              </Pressable>
              <Pressable
                style={styles.button}
                onPress={() => setScrollOffset(-100)}
              >
                <Text>Scroll To Top</Text>
              </Pressable>
              <Pressable
                style={styles.button}
                onPress={() => setScrollOffset(null)}
              >
                <Text>Stop Scroll</Text>
              </Pressable>
            </View>
            <AutoScrollScrollView
              style={styles.scroll}
              manualActivate
              manualScrollBy={scrollOffset}
            >
              {items.map((item) => (
                <ItemMemo key={item.id} text={item.text} />
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
