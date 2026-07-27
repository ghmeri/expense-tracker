import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loadData } from '../store/expenseSlice';
import { Category } from '../types';

const CATEGORY_ICONS: Record<Category, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

type Filter = 'todo' | 'mes' | 'semana';

export default function SummaryScreen() {
  const dispatch = useDispatch();
  const { expenses, users } = useSelector((state: RootState) => state.expenses);
  const [filter, setFilter] = useState<Filter>('mes');

  useEffect(() => { dispatch(loadData()); }, []);

  const now = new Date();
  const filtered = expenses.filter(e => {
    const date = new Date(e.date);
    if (filter === 'semana') return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    if (filter === 'mes') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return true;
  });

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = filtered.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const byUser = users.map(user => ({
    ...user,
    total: filtered.filter(e => e.userId === user.id).reduce((sum, e) => sum + e.amount, 0),
  }));

  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.filterRow}>
        {(['semana', 'mes', 'todo'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'semana' ? 'Esta semana' : f === 'mes' ? 'Este mes' : 'Todo'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{total.toFixed(2)} €</Text>
      </View>

      <Text style={styles.sectionTitle}>Por persona</Text>
      <View style={styles.userRow}>
        {byUser.map(user => (
          <View key={user.id} style={[styles.userCard, { borderTopColor: user.color }]}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={[styles.userAmount, { color: user.color }]}>{user.total.toFixed(2)} €</Text>
            <Text style={styles.userPercent}>
              {total > 0 ? ((user.total / total) * 100).toFixed(0) : 0}%
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Por categoría</Text>
      {sortedCategories.map(([cat, amount]) => (
        <View key={cat} style={styles.catRow}>
          <Text style={styles.catIcon}>{CATEGORY_ICONS[cat as Category]}</Text>
          <View style={styles.catInfo}>
            <Text style={styles.catName}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${total > 0 ? (amount / total) * 100 : 0}%` }]} />
            </View>
          </View>
          <Text style={styles.catAmount}>{amount.toFixed(2)} €</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    flex: 1, padding: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  filterText: { color: '#666', fontSize: 13 },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  totalCard: {
    backgroundColor: '#6200ee', borderRadius: 12, padding: 24,
    alignItems: 'center', marginBottom: 20,
  },
  totalLabel: { color: '#fff', fontSize: 14 },
  totalAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  userRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  userCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8,
    padding: 16, alignItems: 'center', borderTopWidth: 4,
  },
  userName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  userAmount: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  userPercent: { fontSize: 12, color: '#999', marginTop: 2 },
  catRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 8, padding: 12, marginBottom: 8, gap: 10,
  },
  catIcon: { fontSize: 24 },
  catInfo: { flex: 1 },
  catName: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  barContainer: { height: 6, backgroundColor: '#eee', borderRadius: 3 },
  bar: { height: 6, backgroundColor: '#6200ee', borderRadius: 3 },
  catAmount: { fontSize: 13, fontWeight: 'bold', color: '#333' },
});
