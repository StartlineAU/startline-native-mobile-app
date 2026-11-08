import { ChevronRight, Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/events/EventCard';
import { AppText, EmptyState } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useInfiniteEventList } from '@/hooks/useEvents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiErrorMessage } from '@/lib/api';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

const DISCIPLINES = [
  { value: '', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'cycling', label: 'Cycling' },
] as const;

const STATES = [
  { value: '', label: 'All states' },
  { value: 'nsw', label: 'NSW' },
  { value: 'vic', label: 'VIC' },
  { value: 'qld', label: 'QLD' },
  { value: 'wa', label: 'WA' },
  { value: 'sa', label: 'SA' },
  { value: 'tas', label: 'TAS' },
  { value: 'act', label: 'ACT' },
  { value: 'nt', label: 'NT' },
] as const;

const DATES = [
  { value: 'all', label: 'Any date' },
  { value: 'this-month', label: 'This month' },
  { value: 'next-3', label: 'Next 3 months' },
] as const;

const SORTS = [
  { value: 'date', label: 'Soonest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price-asc', label: 'Price: low' },
  { value: 'price-desc', label: 'Price: high' },
] as const;

type Filters = {
  discipline: string;
  state: string;
  dateRange: string;
  sort: string;
  where: string;
};

const initialFilters: Filters = {
  discipline: '',
  state: '',
  dateRange: 'all',
  sort: 'date',
  where: '',
};

export default function DiscoverScreen() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const deferredSearch = useDebouncedValue(search.trim());
  const insets = useSafeAreaInsets();

  const query = useInfiniteEventList({
    limit: 20,
    q: deferredSearch || undefined,
    type: filters.discipline || undefined,
    state: filters.state || undefined,
    where: filters.where || undefined,
    dateRange: filters.dateRange,
    sort: filters.sort,
  });

  const events = useMemo(
    () => query.data?.pages.flatMap((page) => page.events) ?? [],
    [query.data?.pages],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const activeFilters = [
    filters.discipline,
    filters.state,
    filters.dateRange !== 'all' ? filters.dateRange : '',
    filters.where,
  ].filter(Boolean).length;

  const openFilters = () => {
    setDraft(filters);
    setSheetOpen(true);
  };

  const applyFilters = () => {
    setFilters(draft);
    setSheetOpen(false);
  };

  const clearFilters = () => {
    setDraft(initialFilters);
    setFilters(initialFilters);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <View style={styles.headingRow}>
          <View style={styles.heading}>
            <AppText variant="eyebrow">Event calendar</AppText>
            <AppText variant="titleItalic" style={styles.title}>
              Find your next start line.
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            onPress={openFilters}
            style={({ pressed }) => [
              styles.filterButton,
              activeFilters > 0 ? styles.filterActive : null,
              pressed ? { opacity: 0.75 } : null,
            ]}>
            <SlidersHorizontal size={18} color={colors.primary} strokeWidth={2} />
            {activeFilters > 0 ? (
              <View style={styles.filterCount}>
                <AppText variant="meta" style={styles.filterCountText}>
                  {activeFilters}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Search size={18} color={colors.muted} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Events, cities or divisions"
            placeholderTextColor={colors.mutedDark}
            selectionColor={colors.primary}
            returnKeyType="search"
            autoCapitalize="none"
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <X size={17} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {DISCIPLINES.map((option) => {
            const active = filters.discipline === option.value;
            return (
              <Pressable
                key={option.value || 'all'}
                onPress={() =>
                  setFilters((current) => ({ ...current, discipline: option.value }))
                }
                style={[styles.chip, active ? styles.chipActive : null]}>
                <AppText variant="meta" style={active ? styles.chipTextActive : undefined}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.resultsRow}>
          <AppText variant="meta">
            {query.isLoading ? 'Finding events' : `${total} event${total === 1 ? '' : 's'}`}
          </AppText>
          <Pressable onPress={openFilters} style={styles.sortButton}>
            <Filter size={13} color={colors.muted} />
            <AppText variant="meta" style={styles.sortText}>
              {SORTS.find((sort) => sort.value === filters.sort)?.label ?? 'Soonest'}
            </AppText>
            <ChevronRight size={13} color={colors.mutedDark} />
          </Pressable>
        </View>
      </View>

      {query.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="meta">Loading the calendar</AppText>
        </View>
      ) : query.isError ? (
        <EmptyState
          title="Couldn't load events."
          body={apiErrorMessage(query.error)}
          action={<Button label="Try again" onPress={() => void query.refetch()} />}
        />
      ) : events.length === 0 ? (
        <EmptyState
          title="No events found."
          body="Try a different discipline, location or date range."
          action={<Button label="Clear filters" onPress={clearFilters} variant="outline" />}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          onEndReachedThreshold={0.45}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => void query.refetch()}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={colors.primary} size="small" />
                <AppText variant="meta">Loading more</AppText>
              </View>
            ) : undefined
          }
        />
      )}

      <Modal
        visible={sheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSheetOpen(false)}
            accessibilityLabel="Close filters"
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <AppText variant="eyebrow">Refine</AppText>
                <AppText variant="title">Filter events</AppText>
              </View>
              <Pressable onPress={() => setSheetOpen(false)} hitSlop={8}>
                <X size={21} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              <FilterGroup title="State">
                <View style={styles.optionGrid}>
                  {STATES.map((option) => (
                    <FilterOption
                      key={option.value || 'all-states'}
                      label={option.label}
                      active={draft.state === option.value}
                      onPress={() => setDraft((current) => ({ ...current, state: option.value }))}
                    />
                  ))}
                </View>
              </FilterGroup>

              <FilterGroup title="Date">
                <View style={styles.optionGrid}>
                  {DATES.map((option) => (
                    <FilterOption
                      key={option.value}
                      label={option.label}
                      active={draft.dateRange === option.value}
                      onPress={() =>
                        setDraft((current) => ({ ...current, dateRange: option.value }))
                      }
                    />
                  ))}
                </View>
              </FilterGroup>

              <FilterGroup title="Location">
                <View style={styles.searchWrap}>
                  <Search size={17} color={colors.muted} />
                  <TextInput
                    value={draft.where}
                    onChangeText={(where) => setDraft((current) => ({ ...current, where }))}
                    placeholder="City, state or venue"
                    placeholderTextColor={colors.mutedDark}
                    selectionColor={colors.primary}
                    style={styles.searchInput}
                  />
                </View>
              </FilterGroup>

              <FilterGroup title="Sort by">
                <View style={styles.optionGrid}>
                  {SORTS.map((option) => (
                    <FilterOption
                      key={option.value}
                      label={option.label}
                      active={draft.sort === option.value}
                      onPress={() => setDraft((current) => ({ ...current, sort: option.value }))}
                    />
                  ))}
                </View>
              </FilterGroup>
            </ScrollView>

            <View style={styles.sheetActions}>
              <Button
                label="Reset"
                variant="outline"
                onPress={clearFilters}
                icon={<RotateCcw size={16} color={colors.text} />}
                fullWidth={false}
                style={styles.resetButton}
              />
              <Button label="Show events" onPress={applyFilters} style={styles.applyButton} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <AppText variant="label" style={styles.filterLabel}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function FilterOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, active ? styles.optionActive : null]}>
      <AppText variant="meta" style={active ? styles.optionTextActive : undefined}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heading: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 30,
    lineHeight: 31,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  filterCount: {
    position: 'absolute',
    right: -5,
    top: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    color: colors.primaryInk,
    fontSize: 9,
    lineHeight: 11,
  },
  searchWrap: {
    marginTop: spacing.lg,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surfaceAlt,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: 10,
  },
  chips: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipTextActive: {
    color: colors.primaryInk,
  },
  resultsRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortText: {
    color: colors.muted,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  gap: {
    height: spacing.md,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingMore: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.raised,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.raised,
    marginTop: spacing.sm,
  },
  sheetHeader: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sheetBody: {
    paddingTop: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.lg,
  },
  filterGroup: {
    gap: spacing.md,
  },
  filterLabel: {
    color: colors.muted,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.raised,
    backgroundColor: colors.surfaceAlt,
  },
  optionActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  optionTextActive: {
    color: colors.primary,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 0.7,
  },
  applyButton: {
    flex: 1.3,
  },
});
