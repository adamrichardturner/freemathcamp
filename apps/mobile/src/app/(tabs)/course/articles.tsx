import { articleSections } from "@fmc/curriculum/articles";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { unitSymbol } from "@/components/status";
import { Card, IconChip, Row, Screen, Separator, Text } from "@/components/ui";
import { plain } from "@/lib/plain";

/** The web's /articles: every explainer, grouped by category in course order, with search. */
export default function Articles() {
  const [query, setQuery] = useState("");
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articleSections()
      .map((s) => ({ ...s, articles: q ? s.articles.filter((a) => [a.title, a.name, ...a.keywords].some((t) => t.toLowerCase().includes(q))) : s.articles }))
      .filter((s) => s.articles.length > 0);
  }, [query]);
  return (
    <Screen>
      <Stack.Screen options={{ title: "Articles", headerLargeTitle: true, headerSearchBarOptions: { placeholder: "Search articles", onChangeText: (e) => setQuery(e.nativeEvent.text), hideWhenScrolling: false } }} />
      {sections.length === 0 && (
        <Text muted style={{ textAlign: "center", marginTop: 24 }}>
          No articles match “{query}”.
        </Text>
      )}
      {sections.map(({ category, articles }) => (
        <View key={category.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <IconChip name={unitSymbol(category.icon)} gradient />
            <View style={{ flex: 1 }}>
              <Text variant="heading">{category.title}</Text>
              <Text variant="caption" muted numberOfLines={2}>
                {category.description}
              </Text>
            </View>
          </View>
          <Card>
            {articles.map((a, i) => (
              <View key={a.slug}>
                {i > 0 && <Separator inset={16} />}
                <Row title={a.title} subtitle={plain(a.definition)} onPress={() => router.push({ pathname: "/article/[slug]", params: { slug: a.slug } })} />
              </View>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
