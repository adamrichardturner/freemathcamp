import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from "react-native";
import { Segmented } from "@/components/segmented";
import { Empty, Icon, IconChip, Text, type SymbolName } from "@/components/ui";
import type { AppNotification, NotificationFilter } from "@/lib/api";
import { relative } from "@/lib/format";
import { appHref } from "@/lib/links";
import { useNotificationActions, useNotifications } from "@/lib/queries";
import { alpha, useTheme, type Tone } from "@/lib/theme";
import { useLayout, widths } from "@/lib/layout";

const CATEGORY: Record<AppNotification["category"], { icon: SymbolName; tone: Tone }> = {
  account: { icon: "lock.shield.fill", tone: "info" },
  progress: { icon: "star.fill", tone: "success" },
  reminder: { icon: "clock.fill", tone: "warning" },
};

/** The web's notification centre: all, unread and kept, with keep and dismiss on each. */
export default function Notifications() {
  const { c } = useTheme();
  const { sides } = useLayout();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const list = useNotifications(filter);
  const actions = useNotificationActions();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const counts = list.data?.pages[0]?.counts;

  // Opening the centre marks everything as seen, as on the web.
  const { mutate: seen } = actions.seen;
  useEffect(() => seen(), [seen]);

  const open = (n: AppNotification) => {
    if (!n.read) actions.markRead.mutate({ id: n.id, read: true });
    if (n.href) {
      router.back();
      router.push(appHref(n.href));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          headerRight: () =>
            counts?.unread ? (
              <Pressable hitSlop={10} onPress={() => actions.readAll.mutate()}>
                <Text variant="small" weight="semibold" tone="primary">
                  Mark all read
                </Text>
              </Pressable>
            ) : null,
        }}
      />
      <View style={{ paddingTop: 20, ...sides(widths.readable), paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.background, zIndex: 1 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: `Unread${counts?.unread ? ` ${counts.unread}` : ""}` },
            { value: "kept", label: `Kept${counts?.kept ? ` ${counts.kept}` : ""}` },
          ]}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingTop: 20, ...sides(widths.readable), gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        ListEmptyComponent={
          list.isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <Empty icon="bell.slash" title={filter === "kept" ? "Nothing kept" : filter === "unread" ? "All caught up" : "No notifications yet"} text="Milestones, reminders and account notices show up here." />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator /> : undefined}
        renderItem={({ item: n }) => {
          const cat = CATEGORY[n.category];
          return (
            <Pressable onPress={() => open(n)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <View style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 18, borderCurve: "continuous", borderWidth: 1, borderColor: n.read ? c.border : alpha(c.primary, 0.3), backgroundColor: n.read ? c.card : alpha(c.primary, 0.05) }}>
                <IconChip name={cat.icon} tone={cat.tone} size={36} />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {!n.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.primary }} />}
                    <Text weight="semibold" style={{ flex: 1 }} numberOfLines={2}>
                      {n.title}
                    </Text>
                  </View>
                  <Text variant="small" muted>
                    {n.body}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 }}>
                    <Text variant="caption" muted style={{ flex: 1 }}>
                      {relative(n.createdAt)}
                    </Text>
                    <Pressable hitSlop={8} onPress={() => actions.keep.mutate({ id: n.id, kept: !n.kept })} accessibilityLabel={n.kept ? "Unkeep" : "Keep"}>
                      <Icon name={n.kept ? "bookmark.fill" : "bookmark"} size={16} tone={n.kept ? "primary" : "muted"} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => actions.dismiss.mutate(n.id)} accessibilityLabel="Dismiss">
                      <Icon name="xmark" size={14} tone="muted" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
