import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import { Expense } from '../../types';

interface Props {
  expense: Expense;
  userName: string;
  userColor: string;
  onDelete: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

export default function ExpenseCard({ expense, userName, userColor, onDelete }: Props) {
  const [showImage, setShowImage] = useState(false);

  const date = new Date(expense.date).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const confirmDelete = () => {
    Alert.alert('Eliminar gasto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.icon}>{CATEGORY_ICONS[expense.category]}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.description} numberOfLines={1}>
          {expense.description || expense.category}
        </Text>
        <Text style={styles.date}>{date}</Text>
        <View style={[styles.userBadge, { backgroundColor: userColor }]}>
          <Text style={styles.userBadgeText}>{userName}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{expense.amount.toFixed(2)} €</Text>
        <View style={styles.actions}>
          {expense.imageUri && (
            <TouchableOpacity onPress={() => setShowImage(true)}>
              <Text style={styles.actionBtn}>🧾</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={confirmDelete}>
            <Text style={styles.actionBtn}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {expense.imageUri && (
        <Modal visible={showImage} transparent animationType="fade">
          <TouchableOpacity style={styles.modalBg} onPress={() => setShowImage(false)}>
            <Image source={{ uri: expense.imageUri }} style={styles.fullImage} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10,
    marginHorizontal: 16, marginVertical: 6, padding: 12, elevation: 2,
  },
  left: { justifyContent: 'center', marginRight: 12 },
  icon: { fontSize: 28 },
  middle: { flex: 1 },
  description: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  date: { fontSize: 12, color: '#999', marginTop: 2 },
  userBadge: {
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    marginTop: 4, alignSelf: 'flex-start',
  },
  userBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  amount: { fontSize: 16, fontWeight: 'bold', color: '#6200ee' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { fontSize: 18 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center' },
  fullImage: { width: '100%', height: '80%' },
});
