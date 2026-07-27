import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateUsers } from '../store/expenseSlice';
import { updateUserName } from '../services/storage';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const { users } = useSelector((state: RootState) => state.expenses);
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(users.map(u => [u.id, u.name]))
  );

  const handleSave = () => {
    users.forEach(user => {
      if (names[user.id] && names[user.id] !== user.name) {
        updateUserName(user.id, names[user.id]);
      }
    });
    dispatch(updateUsers(users.map(u => ({ ...u, name: names[u.id] ?? u.name }))));
    Alert.alert('✅ Nombres actualizados');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nombres de usuarios</Text>
      {users.map(user => (
        <View key={user.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: user.color }]} />
          <TextInput
            style={styles.input}
            value={names[user.id]}
            onChangeText={text => setNames(prev => ({ ...prev, [user.id]: text }))}
            placeholder="Nombre"
          />
        </View>
      ))}
      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>Guardar cambios</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f5f5f5' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12,
    fontSize: 16, borderWidth: 1, borderColor: '#ddd',
  },
  btn: {
    backgroundColor: '#6200ee', padding: 16, borderRadius: 8,
    alignItems: 'center', marginTop: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
