import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { useDispatch, useSelector } from 'react-redux';
import { addExpense } from '../store/expenseSlice';
import { RootState } from '../store';
import { Category, Expense } from '../types';

const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'Alimentación', value: 'alimentacion', icon: '🛒' },
  { label: 'Transporte', value: 'transporte', icon: '🚗' },
  { label: 'Ocio', value: 'ocio', icon: '🎮' },
  { label: 'Salud', value: 'salud', icon: '💊' },
  { label: 'Hogar', value: 'hogar', icon: '🏠' },
  { label: 'Ropa', value: 'ropa', icon: '👕' },
  { label: 'Tecnología', value: 'tecnologia', icon: '💻' },
  { label: 'Otros', value: 'otros', icon: '📦' },
];

export default function AddExpenseScreen() {
  const dispatch = useDispatch();
  const { users } = useSelector((state: RootState) => state.expenses);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('otros');
  const [userId, setUserId] = useState('user1');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Introduce un importe válido');
      return;
    }
    const expense: Expense = {
      id: Crypto.randomUUID(),
      amount: parseFloat(amount),
      category,
      description,
      date: new Date().toISOString(),
      imageUri: imageUri ?? undefined,
      userId,
      createdAt: new Date().toISOString(),
    };
    dispatch(addExpense(expense));
    setAmount('');
    setDescription('');
    setImageUri(null);
    Alert.alert('✅ Gasto añadido correctamente');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Importe (€)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Compra supermercado"
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Categoría</Text>
      <View style={styles.categories}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.catBtn, category === cat.value && styles.catBtnActive]}
            onPress={() => setCategory(cat.value)}
          >
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catLabel, category === cat.value && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>¿Quién paga?</Text>
      <View style={styles.userRow}>
        {users.map(user => (
          <TouchableOpacity
            key={user.id}
            style={[styles.userBtn, userId === user.id && { backgroundColor: user.color }]}
            onPress={() => setUserId(user.id)}
          >
            <Text style={[styles.userBtnText, userId === user.id && { color: '#fff' }]}>
              {user.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ticket / Foto</Text>
      <View style={styles.imageRow}>
        <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
          <Text style={styles.imageBtnText}>📷 Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
          <Text style={styles.imageBtnText}>🖼️ Galería</Text>
        </TouchableOpacity>
      </View>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Guardar gasto</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    fontSize: 16, borderWidth: 1, borderColor: '#ddd',
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    padding: 10, borderRadius: 8, borderWidth: 1,
    borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center', width: '22%',
  },
  catBtnActive: { borderColor: '#6200ee', backgroundColor: '#ede7f6' },
  catIcon: { fontSize: 20 },
  catLabel: { fontSize: 10, color: '#666', textAlign: 'center' },
  catLabelActive: { color: '#6200ee', fontWeight: 'bold' },
  userRow: { flexDirection: 'row', gap: 10 },
  userBtn: {
    flex: 1, padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff',
  },
  userBtnText: { fontWeight: 'bold', color: '#333' },
  imageRow: { flexDirection: 'row', gap: 10 },
  imageBtn: {
    flex: 1, padding: 14, backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  imageBtnText: { fontSize: 14 },
  preview: { width: '100%', height: 200, borderRadius: 8, marginTop: 10 },
  saveBtn: {
    backgroundColor: '#6200ee', padding: 16, borderRadius: 8,
    alignItems: 'center', marginTop: 24, marginBottom: 40,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
