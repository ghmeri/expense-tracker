import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loadData, removeExpense } from '../store/expenseSlice';
import ExpenseCard from '../components/Expenses/ExpenseCard';
import FilterBar from '../components/Filters/FilterBar';
import { FilterState } from '../types';
import { exportToPDF, exportToCSV } from '../services/exportService';

const initialFilters: FilterState = {
  search: '',
  dateFrom: null,
  dateTo: null,
  category: 'todas',
  userId: 'todos',
};

export default function HomeScreen() {
  const dispatch = useDispatch();
  const { expenses, users } = useSelector((state: RootState) => state.expenses);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => { dispatch(loadData()); }, []);

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name ?? 'Desconocido';
  const getUserColor = (userId: string) => users.find(u => u.id === userId)?.color ?? '#000';

  const filtered = expenses.filter(e => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!e.description?.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
    }
    if (filters.category !== 'todas' && e.category !== filters.category) return false;
    if (filters.userId !== 'todos' && e.userId !== filters.userId) return false;
    if (filters.dateFrom && new Date(e.date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(e.date) > new Date(filters.dateTo)) return false;
    return true;
  });

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  const handleExport = (type: 'pdf' | 'csv') => {
    setShowExport(false);
    if (type === 'pdf') exportToPDF(filtered, users).catch(() => Alert.alert('Error al exportar PDF'));
    else exportToCSV(filtered, users).catch(() => Alert.alert('Error al exportar CSV'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total gastado</Text>
            <Text style={styles.totalAmount}>{total.toFixed(2)} €</Text>
            {filtered.length !== expenses.length && (
              <Text style={styles.filterNote}>{filtered.length} de {expenses.length} gastos</Text>
            )}
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExport(!showExport)}>
            <Text style={styles.exportBtnText}>📤 Exportar</Text>
          </TouchableOpacity>
        </View>
        {showExport && (
          <View style={styles.exportOptions}>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('pdf')}>
              <Text style={styles.exportOptionText}>📄 Exportar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('csv')}>
              <Text style={styles.exportOptionText}>📊 Exportar CSV (Excel)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FilterBar filters={filters} users={users} onChange={setFilters} />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            userName={getUserName(item.userId)}
            userColor={getUserColor(item.userId)}
            onDelete={() => dispatch(removeExpense(item.id))}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {expenses.length === 0 ? 'No hay gastos aún. ¡Añade el primero!' : 'No hay gastos que coincidan con los filtros'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  totalBox: { backgroundColor: '#6200ee', padding: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#fff', fontSize: 14 },
  totalAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  filterNote: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  exportBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  exportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  exportOptions: { marginTop: 12, gap: 8 },
  exportOption: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  exportOptionText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
});
