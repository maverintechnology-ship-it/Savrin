import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import './AdminDashboard.css';

export default function Profile() {
  const { userData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    experience: '',
    dob: '',
    employeeId: '',
    profileImage: ''
  });

  useEffect(() => {
    if (userData) {
      setProfileData({
        name: userData.name || '',
        email: userData.email || '',
        mobile: userData.mobile || '',
        address: userData.address || '',
        experience: userData.experience || '',
        dob: userData.dob || '',
        employeeId: userData.employeeId || userData.id?.substring(0, 8).toUpperCase() || '',
        profileImage: userData.profileImage || ''
      });
    }
  }, [userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image size must be less than 1MB. Please choose a smaller file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        ...profileData,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Failed to update profile.");
    }
  };

  return (
    <DashboardLayout title="Employee Profile">
      <div className="card" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>Employee Information</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>View and manage your personal professional details.</p>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`btn ${isEditing ? 'btn-outline' : 'btn-primary'}`}
            style={{ padding: '10px 24px' }}
          >
            {isEditing ? 'Cancel Changes' : '✏️ Edit Profile'}
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '60px', alignItems: 'start' }}>
            {/* Profile Image Section */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '180px', height: '180px', borderRadius: '24px', background: 'var(--bg-indigo)', 
                border: '4px solid #fff', boxShadow: 'var(--shadow-lg)', 
                margin: '0 auto 20px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {profileData.profileImage ? (
                  <img src={profileData.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '72px', color: 'var(--primary)', opacity: 0.8 }}>{profileData.name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {isEditing && (
                <div style={{ position: 'relative' }}>
                  <input 
                    type="file" 
                    id="profileImg" 
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                    accept="image/*"
                  />
                  <label 
                    htmlFor="profileImg" 
                    className="btn btn-ghost btn-small" 
                    style={{ cursor: 'pointer', fontWeight: 600 }}
                  >
                    📸 Update Photo
                  </label>
                </div>
              )}
              <div style={{ marginTop: '15px' }}>
                <span className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {userData?.role || 'Employee'}
                </span>
              </div>
            </div>

            {/* Profile Info Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  name="name" 
                  value={profileData.name} 
                  onChange={handleChange} 
                  className="form-control" 
                  disabled={!isEditing} 
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  name="email" 
                  value={profileData.email} 
                  className="form-control" 
                  disabled 
                  style={{ background: 'var(--bg-pink)', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input 
                  name="mobile" 
                  value={profileData.mobile} 
                  onChange={handleChange} 
                  className="form-control" 
                  placeholder="+91 00000 00000"
                  disabled={!isEditing} 
                />
              </div>
              <div className="form-group">
                <label>Employee ID</label>
                <input 
                  name="employeeId" 
                  value={profileData.employeeId} 
                  onChange={handleChange} 
                  className="form-control" 
                  disabled={!isEditing} 
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input 
                  name="dob" 
                  type="date"
                  value={profileData.dob} 
                  onChange={handleChange} 
                  className="form-control" 
                  disabled={!isEditing} 
                />
              </div>
              <div className="form-group">
                <label>Experience (Years)</label>
                <input 
                  name="experience" 
                  type="number"
                  value={profileData.experience} 
                  onChange={handleChange} 
                  className="form-control" 
                  placeholder="e.g. 5"
                  disabled={!isEditing} 
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Work Location / Address</label>
                <textarea 
                  name="address" 
                  value={profileData.address} 
                  onChange={handleChange} 
                  className="form-control" 
                  rows="3"
                  placeholder="Detailed address information..."
                  disabled={!isEditing} 
                ></textarea>
              </div>
            </div>
          </div>

          {isEditing && (
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline">
                Discard
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 48px' }}>
                💾 Save Profile Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
