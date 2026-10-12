import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button, contentWidth, EmptyState, LargeTitle, ListRow, Screen } from '@/src/components/ui';
import { useAppStore } from '@/src/store/useAppStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import * as repo from '@/src/db/repository';
import { playSfx } from '@/src/services/sfx';
import { FOLDER_COLORS } from '@/src/types';
import { spacing } from '@/src/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FoldersScreen() {
  const c = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const folders = useAppStore((s) => s.folders);
  const refreshFolders = useAppStore((s) => s.refreshFolders);
  const setSelectedFolderId = useAppStore((s) => s.setSelectedFolderId);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const refreshProjects = useAppStore((s) => s.refreshProjects);
  const [title, setTitle] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshFolders();
    }, [refreshFolders])
  );

  const create = async () => {
    await repo.createFolder(title.trim() || 'New folder');
    setTitle('');
    playSfx('add');
    await refreshFolders();
  };

  return (
    <Screen>
      <FlatList
        data={folders}
        keyExtractor={(i) => i.id}
        style={contentWidth}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
              <LargeTitle>Folders</LargeTitle>
            </View>
            <View style={{ paddingHorizontal: spacing.md, marginBottom: 8, gap: 8 }}>
              <TextInput
                placeholder="New folder name"
                placeholderTextColor={c.textMuted}
                value={title}
                onChangeText={setTitle}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.surfaceElevated,
                  color: c.text,
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 48,
                }}
              />
              <Button label="Create folder" onPress={create} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No folders" body="Organize projects by site, client, or phase." />
        }
        renderItem={({ item }) => (
          <View>
            <ListRow
              title={item.title}
              subtitle={`${item.projectCount} project${item.projectCount === 1 ? '' : 's'}`}
              onPress={() => {
                setSelectedFolderId(item.id);
                router.push('/');
              }}
              onLongPress={() => setMenuId(menuId === item.id ? null : item.id)}
              left={<View style={[styles.swatch, { backgroundColor: item.color }]} />}
              right={<FontAwesome name="chevron-right" size={14} color={c.textMuted} />}
            />
            {menuId === item.id ? (
              <View style={[styles.menu, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {FOLDER_COLORS.map((col) => (
                    <Pressable
                      key={col}
                      accessibilityLabel={`Color ${col}`}
                      onPress={async () => {
                        await repo.updateFolder(item.id, { color: col });
                        await refreshFolders();
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: col,
                        borderWidth: item.color === col ? 3 : 0,
                        borderColor: c.text,
                      }}
                    />
                  ))}
                </View>
                <Button
                  label="Rename"
                  variant="secondary"
                  onPress={() => {
                    setRenameId(item.id);
                    setRenameText(item.title);
                    setMenuId(null);
                  }}
                  style={{ marginBottom: 6 }}
                />
                <Button
                  label="Delete"
                  variant="danger"
                  onPress={() =>
                    Alert.alert('Delete folder?', 'Projects become unfiled.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          await repo.deleteFolder(item.id);
                          if (selectedFolderId === item.id) setSelectedFolderId(undefined);
                          playSfx('delete');
                          setMenuId(null);
                          await refreshFolders();
                          await refreshProjects();
                        },
                      },
                    ])
                  }
                />
              </View>
            ) : null}
          </View>
        )}
      />
      <Modal visible={!!renameId} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, borderColor: c.border, borderWidth: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 18 }}>Rename folder</Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: c.border,
                color: c.text,
                backgroundColor: c.surfaceElevated,
                borderRadius: 10,
                padding: 12,
                minHeight: 48,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button label="Cancel" variant="ghost" onPress={() => setRenameId(null)} style={{ flex: 1 }} />
              <Button
                label="Save"
                style={{ flex: 1 }}
                onPress={async () => {
                  if (!renameId) return;
                  await repo.updateFolder(renameId, { title: renameText.trim() || 'Folder' });
                  setRenameId(null);
                  await refreshFolders();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  menu: {
    marginHorizontal: spacing.md,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
});
