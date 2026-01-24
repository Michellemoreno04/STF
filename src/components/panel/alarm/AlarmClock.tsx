import React, { useState, useEffect, useRef } from 'react';
import { Clock, X, Bell, BellRing, BellOff, Type, AlignLeft, ArrowLeft, Plus, Save, Trash2, Volume2, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import alarmSound from '../../../assets/sounds/alarm.mp3';

interface AlarmData {
    id: string;
    time: string;
    title: string;
    description: string;
    isActive: boolean;
}

export function AlarmClock() {
    const navigate = useNavigate();

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

    const [currentTimeData, setCurrentTimeData] = useState(new Date());

    useEffect(() => {
        currentTimeData// nada
        const timer = setInterval(() => {
            setCurrentTimeData(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [inputTime, setInputTime] = useState('');
    const [inputTitle, setInputTitle] = useState('');
    const [inputDescription, setInputDescription] = useState('');

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
            setAlarms(prev => prev.filter(a => a.id !== id));
        }
        setRingingAlarmId(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    // CRUD Operations
    const handleAddNew = () => {
        setEditingId(null);
        setInputTime('');
        setInputTitle('');
        setInputDescription('');
        setIsEditing(true);
        primeAudio();
    };

    const handleEdit = (alarm: AlarmData) => {
        setEditingId(alarm.id);
        setInputTime(alarm.time);
        setInputTitle(alarm.title);
        setInputDescription(alarm.description);
        setIsEditing(true);
        primeAudio();
    };

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        Swal.fire({
            title: '¿Eliminar alarma?',
            text: "No podrás deshacer esta acción",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                setAlarms(prev => prev.filter(a => a.id !== id));
                if (isEditing && editingId === id) {
                    setIsEditing(false);
                }
            }
        });
    };

    const handleToggleActive = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            // Update existing
            setAlarms(prev => prev.map(a => a.id === editingId ? {
                ...a,
                time: inputTime,
                title: inputTitle || 'Recordatorio',
                description: inputDescription,
                isActive: true
            } : a));
        } else {
            // Create new
            const newAlarm: AlarmData = {
                id: Date.now().toString(),
                time: inputTime,
                title: inputTitle || 'Recordatorio',
                description: inputDescription,
                isActive: true
            };
            setAlarms(prev => [...prev, newAlarm]);
        }

        setIsEditing(false);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Alarma ${editingId ? 'actualizada' : 'creada'}`,
            showConfirmButton: false,
            background: '#1e1b4b',
            color: '#fff',
            timer: 3000
        });
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

    // Helper to calculate time until next alarm instance
    const getTimeUntil = (timeStr: string) => {
        const now = new Date();
        const [hours, minutes] = timeStr.split(':').map(Number);

        const target = new Date(now);
        target.setHours(hours);
        target.setMinutes(minutes);
        target.setSeconds(0);

        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }

        const diff = target.getTime() - now.getTime();
        const diffHours = Math.floor(diff / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours === 0 && diffMinutes === 0) return 'Menos de 1m';
        if (diffHours === 0) return `${diffMinutes}m`;
        return `${diffHours}h ${diffMinutes}m`;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 font-sans relative overflow-hidden flex flex-col">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-950 via-slate-950 to-black opacity-80" />
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Header / Nav */}
            <header className="relative z-50 px-6 py-6 flex justify-between items-center bg-gradient-to-b from-slate-950/80 to-transparent">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-indigo-200 hover:text-white transition-colors group px-3 py-2 rounded-full hover:bg-white/5"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <h1 className="text-xl font-medium tracking-wide text-indigo-100/50">Set an alarm</h1>

                <div className="w-10"></div> {/* Spacer for alignment */}
            </header>

            {/* Main Content Area */}
            <div className="flex-1 relative z-10 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-8">



                {/* Right Column: Alarms List OR Edit Form */}
                <div className="flex-1 w-full max-w-md mx-auto md:max-w-xl bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">

                    {isEditing ? (
                        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                                        {editingId ? <Type size={20} /> : <Plus size={20} />}
                                    </div>
                                    {editingId ? 'Edit Alarm' : 'New Alarm'}
                                </h3>
                                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6 flex-1 overflow-y-auto pr-2">
                                <div className="space-y-4">
                                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 text-center">
                                        <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-4">Alarm time</label>
                                        <input
                                            type="time"
                                            required
                                            value={inputTime}
                                            onChange={(e) => setInputTime(e.target.value)}
                                            className="bg-transparent- border-none text-6xl font-mono font-bold text-white text-center w-full focus:outline-none focus:ring-0 p-0 [color-scheme:dark]"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase mb-2 ml-1">Title</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Break Time!"
                                                value={inputTitle}
                                                onChange={(e) => setInputTitle(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 uppercase mb-2 ml-1">Description</label>
                                            <textarea
                                                rows={3}
                                                placeholder="Details..."
                                                value={inputDescription}
                                                onChange={(e) => setInputDescription(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3 mt-auto">
                                    <button
                                        type="button"
                                        onClick={togglePreviewSound}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 text-indigo-300 rounded-xl transition-colors tooltip"
                                        title="Probar sonido"
                                    >
                                        <Volume2 size={20} />
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} />
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <BellRing size={20} className="text-indigo-400" />
                                    My Alarms
                                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-400 font-normal">{alarms.length}</span>
                                </h3>
                                <button
                                    onClick={handleAddNew}
                                    className="p-2 bg-indigo-600 cursor-pointer hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>

                            {alarms.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                                    <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center">
                                        <BellOff size={40} className="opacity-50" />
                                    </div>
                                    <p className="text-sm">no alarms scheduled</p>
                                    <button onClick={handleAddNew} className="text-indigo-400 cursor-pointer hover:text-indigo-300 text-sm font-medium">Create the first</button>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {alarms
                                        .sort((a, b) => a.time.localeCompare(b.time))
                                        .map(alarm => (
                                            <div
                                                key={alarm.id}
                                                onClick={() => handleEdit(alarm)}
                                                className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                                                ${alarm.isActive
                                                        ? 'bg-gradient-to-r from-indigo-900/20 to-slate-900/40 border-indigo-500/30 hover:border-indigo-500/50'
                                                        : 'bg-white/5 border-white/5 opacity-60 hover:opacity-80'}`}
                                            >
                                                <div className="flex items-center justify-between relative z-10">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-3xl font-mono font-bold ${alarm.isActive ? 'text-white' : 'text-slate-400'}`}>
                                                                {alarm.time}
                                                            </span>
                                                            {alarm.isActive && (
                                                                <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                                                    en {getTimeUntil(alarm.time)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-indigo-200 mt-1 font-medium truncate pr-4">
                                                            {alarm.title}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 ">
                                                        <button
                                                            onClick={(e) => handleToggleActive(alarm.id, e)}
                                                            className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${alarm.isActive ? 'bg-indigo-500' : 'bg-slate-700'}`}
                                                        >
                                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${alarm.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(alarm.id, e)}
                                                            className="p-2 mx-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
