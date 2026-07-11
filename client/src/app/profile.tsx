/* eslint-disable react-refresh/only-export-components --
   Context module: intentionally co-exports the ProfileProvider component and the
   useProfile hook, which belong together in one small module. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJson, storageKeys, writeJson } from '../lib/storage';

export type FarmerProfile = {
  name: string;
  phone: string;
  state: string;
  district: string;
  farmSize: string;
  crops: string[];
  language: string;
};

const DEFAULT_PROFILE: FarmerProfile = {
  name: '',
  phone: '',
  state: '',
  district: '',
  farmSize: '',
  crops: [],
  language: 'en',
};

type ProfileContextShape = {
  profile: FarmerProfile;
  setProfile: (p: FarmerProfile) => void;
};

const ProfileContext = createContext<ProfileContextShape | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<FarmerProfile>(() =>
    readJson<FarmerProfile>(storageKeys.profile, DEFAULT_PROFILE),
  );

  useEffect(() => {
    writeJson(storageKeys.profile, profile);
  }, [profile]);

  const setProfile = useCallback((p: FarmerProfile) => {
    setProfileState(p);
  }, []);

  const value = useMemo(() => ({ profile, setProfile }), [profile, setProfile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
