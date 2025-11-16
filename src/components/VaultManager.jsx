// src/components/VaultManager.jsx
import React, { useState, useCallback } from 'react';
import { EntryList } from './EntryList.jsx';
import { EntryForm } from './EntryForm.jsx';
import { SearchInput, Button, Modal, DataTable } from './common/FormField.jsx';
import { Card, Tabs, Container } from './common/Layout.jsx';
import { useAuditLog } from './hooks/useSecurity.js';

const VaultManager = ({ masterKey, entries = [], onAddEntry, onUpdateEntry, onDeleteEntry }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { logEvent } = useAuditLog();

  const filteredEntries = entries.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddEntry = useCallback((entryData) => {
    onAddEntry(entryData);
    setShowAddModal(false);
    logEvent('entry_added', { service: entryData.service }, 'info');
  }, [onAddEntry, logEvent]);

  const handleUpdateEntry = useCallback((entryData) => {
    onUpdateEntry(selectedEntry.id, entryData);
    setShowEditModal(false);
    setSelectedEntry(null);
    logEvent('entry_updated', { id: selectedEntry.id, service: entryData.service }, 'info');
  }, [onUpdateEntry, selectedEntry, logEvent]);

  const handleDeleteEntry = useCallback((entryId) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      onDeleteEntry(entryId);
      logEvent('entry_deleted', { id: entryId }, 'warning');
    }
  }, [onDeleteEntry, logEvent]);

  const handleEditEntry = useCallback((entry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  }, []);

  const handleCopyPassword = useCallback((password) => {
    navigator.clipboard.writeText(password);
    logEvent('password_copied', { timestamp: Date.now() }, 'info');
  }, [logEvent]);

  const tabs = [
    { id: 'list', label: 'Entries' },
    { id: 'grid', label: 'Grid View' },
    { id: 'table', label: 'Table View' }
  ];

  const tableColumns = [
    { key: 'service', label: 'Service', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'username', label: 'Username', sortable: true },
    { key: 'lastModified', label: 'Last Modified', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, entry) => (
        <div className="entry-actions">
          <Button onClick={() => handleCopyPassword(entry.password)} variant="outline" size="sm">
            Copy
          </Button>
          <Button onClick={() => handleEditEntry(entry)} variant="outline" size="sm">
            Edit
          </Button>
          <Button onClick={() => handleDeleteEntry(entry.id)} variant="danger" size="sm">
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <Container>
      <Card>
        <div className="vault-header">
          <h2>Password Vault</h2>
          <div className="vault-controls">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search entries..."
            />
            <Button onClick={() => setShowAddModal(true)} variant="primary">
              Add Entry
            </Button>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="vault-content">
          {activeTab === 'list' && (
            <EntryList
              entries={filteredEntries}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
              onCopyPassword={handleCopyPassword}
            />
          )}

          {activeTab === 'grid' && (
            <div className="entries-grid">
              {filteredEntries.map(entry => (
                <Card key={entry.id} className="entry-card">
                  <h4>{entry.service}</h4>
                  <p>{entry.name}</p>
                  <div className="entry-actions">
                    <Button onClick={() => handleCopyPassword(entry.password)} size="sm">
                      Copy Password
                    </Button>
                    <Button onClick={() => handleEditEntry(entry)} variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'table' && (
            <DataTable
              data={filteredEntries}
              columns={tableColumns}
              searchable={false}
              sortable={true}
            />
          )}
        </div>
      </Card>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Entry">
        <EntryForm
          onSubmit={handleAddEntry}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Entry">
        <EntryForm
          entry={selectedEntry}
          onSubmit={handleUpdateEntry}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </Container>
  );
};

export default VaultManager;
