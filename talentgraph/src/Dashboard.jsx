import React, { useState, useEffect } from 'react';
import { getRoles, createRole } from './api';

export default function Dashboard({ onSelectRole, onLogout }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newRole, setNewRole] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await getRoles();
      // The backend returns an array directly, not an object with a 'roles' key.
      setRoles(Array.isArray(data) ? data : (data.roles || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRole.title || !newRole.description) return;
    try {
      const created = await createRole(newRole.title, newRole.description);
      setRoles([created, ...roles]);
      setShowModal(false);
      setNewRole({ title: '', description: '' });
    } catch (err) {
      alert("Error creating role: " + err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>HR Workspace</h2>
        <div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginRight: '1rem' }}>+ Create New Role</button>
          <button className="btn btn-outline" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {loading ? (
        <p>Loading your workspace...</p>
      ) : roles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--surface)', borderRadius: '12px' }}>
          <h3>No Roles Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Create your first Job Role to start processing candidates.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create New Role</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {roles.map(role => (
            <div 
              key={role.id} 
              style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border)' }}
              onClick={() => onSelectRole(role)}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{role.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {role.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card, #ffffff)', padding: '2.5rem', borderRadius: '16px', width: '100%', maxWidth: '450px', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-hover)', position: 'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>✕</button>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>Create New Job Role</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Define the specific role to provide exact context for the Llama 3.2 AI evaluations.</p>
            
            <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Job Title</label>
                <input 
                  type="text" 
                  className="form-textarea" 
                  style={{ height: '42px', minHeight: '42px', padding: '0 0.85rem' }}
                  value={newRole.title} 
                  onChange={e => setNewRole({...newRole, title: e.target.value})} 
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Job Description / Context</label>
                <textarea 
                  className="form-textarea" 
                  style={{ height: '140px', padding: '0.85rem' }}
                  value={newRole.description} 
                  onChange={e => setNewRole({...newRole, description: e.target.value})} 
                  placeholder="Paste the JD, key requirements, or specific tools here..."
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem', fontSize: '1rem' }}>Create Role</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
