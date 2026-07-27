import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, ScrollView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FilterState, Category, User } from '../../types';

interface Props {
  filters: FilterState;
  users: User[];
  onChange: (filters: FilterState) => void;
}

const CATEGORIES: { label: string; value: Category | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: '🛒 Alimentación', value: 'alimentacion' },
  { label: '🚗 Transporte', value: 'transporte' },
  { label: '🎮 Ocio', value: 'ocio' },
  { label: '💊 Salud', value: 'salud' },
  { label: '🏠 Hogar', value: 'hogar' },
  { label: '👕 Ropa', value: 'ropa' },
  { label: '💻 Tecnología', value: 'tecnologia' },
  { label: '📦 Otros', value: 'otros' },
];

export default function FilterBar({ filters, users, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  const activeFiltersCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.category !== 'todas' ? filters.category : null,
    filters.userId !== 'todos' ? filters.userId : null,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onChange({ search: filters.search, dateFrom: null, dateTo: null, category: 'todas', userId: 'todos' });
  };

  return (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar gastos..."
          value={filters.search}
          onChangeText={text => onChange({ ...filters, search: text })}
        />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.filterBtnText}>
            ⚙️{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros avanzados</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.sectionLabel}>📅 Rango de fechas</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDateFrom(true)}>
                  <Text style={styles.dateBtnText}>
                    Desde: {filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString('es-ES') : 'Sin filtro'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDateTo(true)}>
                  <Text style={styles.dateBtnText}>
                    Hasta: {filters.dateTo ? new Date(filters.dateTo).toLocaleDateString('es-ES') : 'Sin filtro'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDateFrom && (
                <DateTimePicker
                  value={filters.dateFrom ? new Date(filters.dateFrom) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowDateFrom(false);
                    if (date) onChange({ ...filters, dateFrom: date.toISOString() });
                  }}
                />
              )}

              {showDateTo && (
                <DateTimePicker
                  value={filters.dateTo ? new Date(filters.dateTo) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowDateTo(false);
                    if (date) onChange({ ...filters, dateTo: date.toISOString() });
                  }}
                />
              )}

              <Text style={styles.sectionLabel}>🗂️ Categoría</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.chip, filters.category === cat.value && styles.chipActive]}
                    onPress={() => onChange({ ...filters, category: cat.value })}
                  >
                    <Text style={[styles.chipText, filters.category === cat.value && styles.chipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>👤 Persona</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, filters.userId === 'todos' && styles.chipActive]}
                  onPress={() => onChange({ ...filters, userId: 'todos' })}
                >
                  <Text style={[styles.chipText, filters.userId === 'todos' && styles.chipTextActive]}>Todos</Text>
                </TouchableOpacity>
                {users.map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.chip, filters.userId === user.id && { backgroundColor: user.color, borderColor: user.color }]}
                    onPress={() => onChange({ ...filters, userId: user.id })}
                  >
                    <Text style={[styles.chipText, filters.userId === user.id && styles.chipTextActive]}>
                      {user.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Limpiar filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.applyBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 8, padding: 12 },
  searchInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10,
    fontSize: 14, borderWidth: 1, borderColor: '#ddd',
  },
  filterBtn: {
    backgroundColor: '#6200ee', borderRadius: 8,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  filterBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeBtn: { fontSize: 18, color: '#999' },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateBtn: {
    flex: 1, padding: 10, backgroundColor: '#f5f5f5',
    borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
  },
  dateBtnText: { fontSize: 12, color: '#333', textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 20 },
  resetBtn: {
    flex: 1, padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#6200ee', alignItems: 'center',
  },
  resetBtnText: { color: '#6200ee', fontWeight: 'bold' },
  applyBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#6200ee', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: 'bold' },
});
