// src/components/EntryList.jsx
import React from 'react';
import EntryItem from './EntryItem.jsx';

const EntryList = ({ entries, onEdit, onDelete, onCopy }) => {
    if (entries.length === 0) {
        return <p>No entries found for this type.</p>;
    }

    return (
        <ul className="entry-list">
            {entries.slice().reverse().map(entry => (
                <EntryItem
                    key={entry.id}
                    entry={entry}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCopy={onCopy}
                />
            ))}
        </ul>
    );
};

export default EntryList;
