import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import alarmSound from '../../../assets/sounds/alarm.mp3';
import Swal from 'sweetalert2';

interface AlarmData {
    id: string;
    time: string;
    title: string;
    description: string;
    isActive: boolean;
}

interface AlarmContextType {
    alarms: AlarmData[];
    addAlarm: (time: string, title: string, description: string) => void;
    updateAlarm: (id: string, time: string, title: string, description: string) => void;
    deleteAlarm: (id: string) => void;
    toggleActive: (id: string) => void;
    primeAudio: () => void;
    togglePreviewSound: () => void;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
    // State for multiple alarms
    const [alarms, setAlarms] = useState<AlarmData[]>(() => {
        const saved = localStorage.getItem('alarmsData');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing alarms:", e);
                return [];
            }
        }

        // Migration: Check for single alarm data
        const oldSingleAlarm = localStorage.getItem('alarmData');
        if (oldSingleAlarm) {
            try {
                const parsed = JSON.parse(oldSingleAlarm);
                return [{
                    id: Date.now().toString(),
                    time: parsed.time,
                    title: parsed.title,
                    description: parsed.description,
                    isActive: true
                }];
            } catch (e) { console.error(e); }
        }

        // Fallback for very old version
        const oldTime = localStorage.getItem('alarmTime');
        if (oldTime) {
            return [{
                id: Date.now().toString(),
                time: oldTime,
                title: 'Recordatorio',
                description: '',
                isActive: true
            }];
        }

        return [];
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [ringingAlarmId, setRingingAlarmId] = useState<string | null>(null);

    // Audio Initialization
    useEffect(() => {
        audioRef.current = new Audio(alarmSound);
        audioRef.current.loop = true;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const primeAudio = () => {
        if (audioRef.current) {
            const originalVolume = audioRef.current.volume;
            audioRef.current.volume = 0;
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                audioRef.current!.volume = originalVolume;
            }).catch(e => console.log("Audio priming prevented:", e));
        }
    };

    // Save alarms to local storage whenever they change
    useEffect(() => {
        localStorage.setItem('alarmsData', JSON.stringify(alarms));
    }, [alarms]);

    // Update document title when alarm is ringing
    useEffect(() => {
        let interval: any;
        if (ringingAlarmId) {
            const ringingAlarm = alarms.find(a => a.id === ringingAlarmId);
            const baseTitle = ringingAlarm?.title ? `⏰ ${ringingAlarm.title}` : '⏰ Alarm Ringing!';

            let showEmoji = true;
            interval = setInterval(() => {
                document.title = showEmoji ? baseTitle : 'STF Panel';
                showEmoji = !showEmoji;
            }, 1000);
        } else {
            document.title = 'STF Panel';
        }

        return () => {
            if (interval) clearInterval(interval);
            document.title = 'STF Panel';
        };
    }, [ringingAlarmId, alarms]);

    // Alarm Checker Interval
    useEffect(() => {
        if (ringingAlarmId) return; // Don't trigger new ones if one is ringing

        const checkAlarm = setInterval(() => {
            const now = new Date();
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMinutes = String(now.getMinutes()).padStart(2, '0');
            const currentSeconds = now.getSeconds();
            const currentTimeString = `${currentHours}:${currentMinutes}`;

            const matchedAlarm = alarms.find(a =>
                a.isActive &&
                a.time === currentTimeString &&
                currentSeconds < 2 // 2 second window to trigger
            );

            if (matchedAlarm) {
                triggerAlarm(matchedAlarm);
            }

        }, 1000);

        return () => clearInterval(checkAlarm);
    }, [alarms, ringingAlarmId]);

    const triggerAlarm = (activeAlarm: AlarmData) => {
        setRingingAlarmId(activeAlarm.id);

        if (audioRef.current) {
            audioRef.current.play().catch(e => {
                console.error("Error playing sound:", e);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: '¡Alarma! (Sonido bloqueado)',
                    text: 'Haz clic para activar el sonido',
                    showConfirmButton: false,
                    timer: 5000
                });
            });
        }

        Swal.fire({
            title: `⏰ ${activeAlarm.title || 'Alarm time'}`,
            html: activeAlarm.description ? `<p class="text-slate-600">${activeAlarm.description}</p>` : '¡Is time to break!',
            icon: 'info',
            showCancelButton: false,
            confirmButtonText: 'Stop Alarm',
            confirmButtonColor: '#4f46e5',
            allowOutsideClick: false,
            allowEscapeKey: false,
            backdrop: `rgba(79, 70, 229, 0.4)`
        }).then(() => {
            stopAlarm(activeAlarm.id);
        });
    };

    const stopAlarm = (idToDelete?: string) => {
        const id = idToDelete || ringingAlarmId;
        if (id) {
            // Optional: Auto-disable alarm after calling?
            // setAlarms(prev => prev.map(a => a.id === id ? { ...a, isActive: false } : a));
        }
        setRingingAlarmId(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const togglePreviewSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }, 3000);
        }
    };

    // Public Actions
    const addAlarm = (time: string, title: string, description: string) => {
        const newAlarm: AlarmData = {
            id: Date.now().toString(),
            time,
            title: title || 'Recordatorio',
            description,
            isActive: true
        };
        setAlarms(prev => [...prev, newAlarm]);
        primeAudio();
    };

    const updateAlarm = (id: string, time: string, title: string, description: string) => {
        setAlarms(prev => prev.map(a => a.id === id ? {
            ...a,
            time,
            title: title || 'Recordatorio',
            description,
            isActive: true
        } : a));
        primeAudio();
    };

    const deleteAlarm = (id: string) => {
        setAlarms(prev => prev.filter(a => a.id !== id));
    };

    const toggleActive = (id: string) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
    };

    return (
        <AlarmContext.Provider value={{ alarms, addAlarm, updateAlarm, deleteAlarm, toggleActive, primeAudio, togglePreviewSound }}>
            {children}
        </AlarmContext.Provider>
    );
}

export function useAlarm() {
    const context = useContext(AlarmContext);
    if (context === undefined) {
        throw new Error('useAlarm must be used within an AlarmProvider');
    }
    return context;
}
