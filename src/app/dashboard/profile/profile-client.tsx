"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Lock, Link as LinkIcon, Camera, Loader2, Save, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/page-wrapper";
import { useRouter } from "next/navigation";

export function ProfileClient({ user }: { user: any }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
    profilePicture: user.profilePicture || "",
    currentPassword: "",
    newPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("Image must be less than 500KB. Please compress it or use an external URL.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, profilePicture: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const payload: any = {};
      
      if (formData.username !== user.username) payload.username = formData.username;
      if (formData.profilePicture !== user.profilePicture) payload.profilePicture = formData.profilePicture;
      
      if (formData.newPassword) {
        payload.newPassword = formData.newPassword;
        payload.currentPassword = formData.currentPassword;
      }

      if (Object.keys(payload).length === 0) {
        alert("No changes detected.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert("Profile updated successfully!");
        setFormData({ ...formData, currentPassword: "", newPassword: "" });
        router.refresh();
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      alert("An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
            <UserCircle className="w-8 h-8 text-cyan-400" /> My Profile
          </h1>
          <p className="text-slate-400">
            Manage your personal settings, password, and public profile picture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Avatar Preview Section */}
          <div className="md:col-span-1 space-y-6">
            <Card className="glass-card flex flex-col items-center p-6 text-center">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 mb-4 bg-slate-800 flex items-center justify-center relative group"
              >
                {formData.profilePicture && !imageError ? (
                  <img 
                    src={formData.profilePicture} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    onLoad={() => setImageError(false)}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-lg font-bold text-blue-300">
                    {(formData.username || '?').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '?'}
                  </div>
                )}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </motion.div>
              <h3 className="text-xl font-bold text-white">{formData.username}</h3>
              <p className="text-sm text-cyan-400 font-medium">{user.role}</p>
              <p className="text-xs text-slate-500 mt-1">{user.email}</p>
            </Card>
          </div>

          {/* Edit Form Section */}
          <div className="md:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white text-lg">General Information</CardTitle>
                <CardDescription>Update your basic account details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-300">Username</Label>
                  <Input 
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="bg-black/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/50" 
                    icon={<UserCircle className="w-5 h-5" />}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profilePicture" className="text-slate-300">Profile Picture</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="profilePicture"
                      name="profilePicture"
                      placeholder="https://i.imgur.com/... or upload directly"
                      value={formData.profilePicture.startsWith("data:image") ? "(uploaded image)" : formData.profilePicture}
                      onChange={(e) => {
                        setImageError(false);
                        handleChange(e);
                      }}
                      readOnly={formData.profilePicture.startsWith("data:image")}
                      className="bg-black/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/50" 
                      icon={<LinkIcon className="w-5 h-5" />}
                    />
                  </div>
                  {formData.profilePicture.startsWith("data:image") ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Custom image uploaded
                      </span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, profilePicture: ""})}
                        className="text-[11px] text-red-400 hover:text-red-300 underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-500 mt-1">Paste a direct image link or click the camera icon above to upload.</p>
                      {imageError && formData.profilePicture && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Invalid image URL. You must paste a direct image link (e.g. ending in .png or .jpg).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white text-lg">Security</CardTitle>
                <CardDescription>Change your password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-slate-300">Current Password</Label>
                  <Input 
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    placeholder="Enter current password to authorize changes"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="bg-black/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/50" 
                    icon={<Lock className="w-5 h-5" />}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-300">New Password</Label>
                  <Input 
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="bg-black/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/50" 
                    icon={<Lock className="w-5 h-5" />}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20"
              >
                {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
