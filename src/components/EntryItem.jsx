// src/components/EntryItem.jsx
import React from 'react';

const EntryItem = ({ entry, onEdit, onDelete, onCopy }) => {
    const renderFields = () => {
        switch (entry.type) {
            case 'passwords':
                return (
                    <>
                        {entry.username && <div className="entry-field"><strong>User:</strong> {entry.username}</div>}
                        {entry.password && (
                            <div className="entry-field">
                                <strong>Pass:</strong> ••••••
                                <button className="button secondary" style={{marginLeft: '10px', padding: '2px 8px'}} onClick={() => onCopy(entry.password)}>Copy</button>
                            </div>
                        )}
                        {entry.url && <div className="entry-field"><strong>URL:</strong> {entry.url}</div>}
                    </>
                );
            case 'credentials':
                return (
                    <>
                        {entry.username && <div className="entry-field"><strong>User:</strong> {entry.username}</div>}
                        {entry.password && (
                            <div className="entry-field">
                                <strong>Token:</strong> ••••••
                                <button className="button secondary" style={{marginLeft: '10px', padding: '2px 8px'}} onClick={() => onCopy(entry.password)}>Copy</button>
                            </div>
                        )}
                    </>
                );
            case 'keypairs':
                return (
                    <>
                        {entry.privateKey && (
                            <div className="entry-field">
                                <strong>Private Key:</strong>
                                <div className="key-field">{entry.privateKey}</div>
                                <button className="button secondary" style={{marginTop: '5px', padding: '2px 8px'}} onClick={() => onCopy(entry.privateKey)}>Copy Private</button>
                            </div>
                        )}
                        {entry.publicKey && (
                            <div className="entry-field">
                                <strong>Public Key:</strong>
                                <div className="key-field">{entry.publicKey}</div>
                                <button className="button secondary" style={{marginTop: '5px', padding: '2px 8px'}} onClick={() => onCopy(entry.publicKey)}>Copy Public</button>
                            </div>
                        )}
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <li className="entry-item">
            <h3>{entry.title}</h3>
            {renderFields()}
            {entry.notes && <div className="entry-field notes"><strong>Notes:</strong> {entry.notes}</div>}
            <div className="entry-field" style={{gridColumn: '1 / -1', fontSize: '0.8rem'}}>
                Last updated: {new Date(entry.updatedAt).toLocaleString()}
            </div>
            <div className="entry-actions">
                <button className="button secondary" onClick={() => onEdit(entry)}>Edit ✏️</button>
                <button className="button" onClick={() => onDelete(entry.id)}>Delete 🗑️</button>
            </div>
        </li>
    );
};

export default EntryItem;
