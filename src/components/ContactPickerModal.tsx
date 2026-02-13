import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Feather } from '@expo/vector-icons';

interface Contact {
    id: string;
    name: string;
    phoneNumber?: string;
}

interface ContactPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectContact: (contact: { name: string; phone?: string }) => void;
}

export const ContactPickerModal: React.FC<ContactPickerModalProps> = ({
    visible,
    onClose,
    onSelectContact,
}) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

    useEffect(() => {
        if (visible) {
            console.log('[ContactPicker] Modal opened');
            // Reset search when modal opens
            setSearchQuery('');
            // Only load contacts if we haven't loaded them yet or permission is undetermined
            if (contacts.length === 0 || permissionStatus === 'undetermined') {
                console.log('[ContactPicker] Loading contacts...');
                checkPermissionAndLoadContacts();
            } else {
                console.log('[ContactPicker] Using cached contacts:', contacts.length);
            }
        }
    }, [visible]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredContacts(contacts);
        } else {
            const filtered = contacts.filter(contact =>
                contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.phoneNumber?.includes(searchQuery)
            );
            setFilteredContacts(filtered);
            console.log('[ContactPicker] Filtered contacts:', filtered.length);
        }
    }, [searchQuery, contacts]);

    const checkPermissionAndLoadContacts = async () => {
        try {
            console.log('[ContactPicker] Requesting permission...');
            const { status } = await Contacts.requestPermissionsAsync();
            console.log('[ContactPicker] Permission status:', status);

            if (status === 'granted') {
                setPermissionStatus('granted');
                await loadContacts();
            } else {
                setPermissionStatus('denied');
            }
        } catch (error) {
            console.error('[ContactPicker] Error requesting contacts permission:', error);
            Alert.alert('Error', 'Failed to request contacts permission');
        }
    };

    const loadContacts = async () => {
        setIsLoading(true);
        try {
            console.log('[ContactPicker] Fetching contacts from device...');
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers],
            });

            console.log('[ContactPicker] Fetched contacts:', data.length);

            if (data.length > 0) {
                const formattedContacts: Contact[] = data
                    .map(contact => ({
                        id: contact.id,
                        name: contact.name || 'Unknown',
                        phoneNumber: contact.phoneNumbers?.[0]?.number,
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));

                console.log('[ContactPicker] Formatted contacts:', formattedContacts.length);
                setContacts(formattedContacts);
                setFilteredContacts(formattedContacts);
            } else {
                // No contacts found
                console.log('[ContactPicker] No contacts found on device');
                setContacts([]);
                setFilteredContacts([]);
            }
        } catch (error) {
            console.error('[ContactPicker] Error loading contacts:', error);
            Alert.alert('Error', 'Failed to load contacts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectContact = (contact: Contact) => {
        console.log('[ContactPicker] Contact selected:', contact.name, contact.phoneNumber);
        // Call the callback with selected contact
        onSelectContact({
            name: contact.name,
            phone: contact.phoneNumber,
        });
        // Close the modal
        onClose();
    };

    const handleOpenSettings = () => {
        Linking.openSettings();
    };

    const renderPermissionDenied = () => (
        <View style={styles.permissionContainer}>
            <Feather name="alert-circle" size={64} color="#FF9500" />
            <Text style={styles.permissionTitle}>Contacts Permission Required</Text>
            <Text style={styles.permissionMessage}>
                ScoreBook needs access to your contacts to quickly add team members.
                You can grant permission in your device settings.
            </Text>
            <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
                <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContactItem = ({ item, index }: { item: Contact; index: number }) => {
        if (index === 0) {
            console.log('[ContactPicker] Rendering first contact:', item.name);
        }
        return (
            <TouchableOpacity
                style={styles.contactItem}
                onPress={() => handleSelectContact(item)}
            >
                <View style={styles.contactAvatar}>
                    <Feather name="user" size={20} color="#666" />
                </View>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    {item.phoneNumber && (
                        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
                    )}
                </View>
                <Feather name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Contact</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Feather name="x" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {permissionStatus === 'denied' ? (
                        renderPermissionDenied()
                    ) : (
                        <>
                            <View style={styles.searchContainer}>
                                <Feather name="search" size={20} color="#999" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search contacts..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCapitalize="none"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Feather name="x-circle" size={20} color="#999" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {isLoading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#007AFF" />
                                    <Text style={styles.loadingText}>Loading contacts...</Text>
                                </View>
                            ) : filteredContacts.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Feather name="users" size={48} color="#ccc" />
                                    <Text style={styles.emptyText}>
                                        {searchQuery ? 'No contacts found' : 'No contacts available'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.listWrapper}>
                                    <FlatList
                                        data={filteredContacts}
                                        keyExtractor={(item) => item.id}
                                        renderItem={renderContactItem}
                                        showsVerticalScrollIndicator={true}
                                        contentContainerStyle={styles.listContent}
                                    />
                                </View>
                            )}
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        paddingVertical: 4,
    },
    listWrapper: {
        flex: 1,
        minHeight: 200,
    },
    listContent: {
        paddingBottom: 20,
    },
    contactList: {
        flex: 1,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    contactAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: 14,
        color: '#666',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
    // Permission Denied Styles
    permissionContainer: {
        padding: 32,
        alignItems: 'center',
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginTop: 16,
        marginBottom: 12,
    },
    permissionMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    settingsButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
    },
    settingsButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
});
