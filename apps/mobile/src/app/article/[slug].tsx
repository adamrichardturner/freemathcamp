import { articleBySlug, articleCategories } from "@fmc/curriculum/articles";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Share, View, Pressable } from "react-native";
import { Lesson, Rich } from "@/components/rich";
import { Card, CardHeader, Icon, Row, Screen, Separator, Text } from "@/components/ui";
import { WEB_URL } from "@/lib/api";
import { exerciseRef } from "@/lib/course";
import { plain } from "@/lib/plain";

/** One article: the same blocks as a lesson, plus the lessons it supports and related reading. */
export default function Article() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const article = articleBySlug(slug);
  if (!article) return null;
  const category = articleCategories.find((c) => c.id === article.category);
  return (
    <Screen contentStyle={{ paddingHorizontal: 0 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => Share.share({ url: `${WEB_URL}/articles/${article.slug}`, message: article.title })} accessibilityLabel="Share">
              <Icon name="square.and.arrow.up" size={19} tone="primary" />
            </Pressable>
          ),
        }}
      />
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Text variant="label" tone="primary">
          {category?.title}
        </Text>
        <Text variant="display" style={{ fontSize: 36, lineHeight: 40 }}>
          {article.title}
        </Text>
        <Rich md={article.summary} muted />
      </View>
      <Lesson source={{ kind: "article", slug: article.slug }} />
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        {article.lessons.length > 0 && (
          <Card>
            <CardHeader title="Practise it" icon="dumbbell.fill" />
            <View style={{ paddingVertical: 6 }}>
              {article.lessons.map((id, i) => {
                const ref = exerciseRef(id);
                if (!ref) return null;
                return (
                  <View key={id}>
                    {i > 0 && <Separator inset={16} />}
                    <Row title={ref.exercise.title} subtitle={ref.unit.title} onPress={() => router.push({ pathname: "/lesson/[id]", params: { id } })} />
                  </View>
                );
              })}
            </View>
          </Card>
        )}
        {article.related.length > 0 && (
          <Card>
            <CardHeader title="Related reading" icon="book.pages" iconTone="chart2" />
            <View style={{ paddingVertical: 6 }}>
              {article.related.map((s, i) => {
                const a = articleBySlug(s);
                if (!a) return null;
                return (
                  <View key={s}>
                    {i > 0 && <Separator inset={16} />}
                    <Row title={a.title} subtitle={plain(a.definition)} onPress={() => router.push({ pathname: "/article/[slug]", params: { slug: s } })} />
                  </View>
                );
              })}
            </View>
          </Card>
        )}
      </View>
    </Screen>
  );
}
