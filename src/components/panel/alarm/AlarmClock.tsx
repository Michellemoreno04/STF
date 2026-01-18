import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, BellOff, BellRing, Type, AlignLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import alarmSound from '../../../assets/sounds/alarm.mp3';

interface AlarmData {
    time: string;
    title: string;
    description: string;
}

export function AlarmClock() {
    const [alarm, setAlarm] = useState<AlarmData | null>(() => {
        const saved = localStorage.getItem('alarmData');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                // Fallback for old version
                const oldTime = localStorage.getItem('alarmTime');
                if (oldTime) {
                    return { time: oldTime, title: 'Recordatorio', description: '' };
                }
            }
        } else {
            // Fallback for old version if alarmData doesn't exist but alarmTime does
            const oldTime = localStorage.getItem('alarmTime');
            if (oldTime) {
                return { time: oldTime, title: 'Recordatorio', description: '' };
            }
        }
        return null;
    });

    const [currentTimeData, setCurrentTimeData] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTimeData(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState(1); // 1 = time selection, 2 = title/description
    const [inputTime, setInputTime] = useState(alarm?.time || '');
    const [inputTitle, setInputTitle] = useState(alarm?.title || '');
    const [inputDescription, setInputDescription] = useState(alarm?.description || '');

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isRinging, setIsRinging] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        const calculateTimeRemaining = () => {
            if (!alarm) {
                setTimeRemaining('');
                return;
            }

            const now = new Date();
            const [hours, minutes] = alarm.time.split(':').map(Number);

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
            const diffSeconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(`${diffHours}h ${diffMinutes}m ${diffSeconds}s`);
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000); // Update every second for real-time countdown
        return () => clearInterval(interval);
    }, [alarm, currentTimeData]); // Re-calculate when alarm changes or minute updates (via currentTimeData dependency indirectly or just interval)

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio(alarmSound);
        audioRef.current.loop = true;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Función para "desbloquear" el audio en navegadores que requieren interacción
    const primeAudio = () => {
        if (audioRef.current) {
            // Intentar reproducir y pausar inmediatamente con volumen 0
            const originalVolume = audioRef.current.volume;
            audioRef.current.volume = 0;
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                audioRef.current!.volume = originalVolume;
            }).catch(e => console.log("Audio priming prevented:", e));
        }
    };


    useEffect(() => {
        if (!alarm || isRinging) return;

        const checkAlarm = setInterval(() => {
            const now = new Date();
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMinutes = String(now.getMinutes()).padStart(2, '0');
            const currentSeconds = now.getSeconds();
            const currentTimeString = `${currentHours}:${currentMinutes}`;

            // Check specifically at the start of the minute or if we somehow missed it but still in the same minute
            // Note: Simplest check is equality. Since we check every 1s, we shouldn't miss it unless the tab is totally frozen.
            if (currentTimeString === alarm.time && currentSeconds < 2) {
                triggerAlarm(alarm);
                clearInterval(checkAlarm);
            } else if (currentTimeString === alarm.time && !isRinging) {
                // If we are in the minute but past the first 2 seconds, checking if we already triggered would essentially rely on isRinging or external state.
                // For safety, we can just trigger if it matches and let state handle dedupe, but explicit seconds check prevents multiple triggers if interval is messy.
                // Let's stick to the standard check but verify audio plays.
                if (!isRinging) triggerAlarm(alarm);
                clearInterval(checkAlarm);
            }
        }, 1000);

        return () => clearInterval(checkAlarm);
    }, [alarm, isRinging]);

    const triggerAlarm = (activeAlarm: AlarmData) => {
        setIsRinging(true);
        if (audioRef.current) {
            audioRef.current.play().catch(e => {
                console.error("Error playing sound (likely interaction required):", e);
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
            title: `⏰ ${activeAlarm.title || 'Recordatorio'}`,
            html: activeAlarm.description ? `<p class="text-slate-600">${activeAlarm.description}</p>` : '¡Es hora de tu recordatorio!',
            icon: 'info',
            showCancelButton: false,
            confirmButtonText: 'Detener Alarma',
            confirmButtonColor: '#4f46e5',
            allowOutsideClick: false,
            allowEscapeKey: false,
            backdrop: `rgba(79, 70, 229, 0.4)`
        }).then(() => {
            stopAlarm();
        });
    };

    const stopAlarm = () => {
        setIsRinging(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setAlarm(null);
        localStorage.removeItem('alarmData');
        localStorage.removeItem('alarmTime');
    };

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputTime) {
            setStep(2);
        }
    };

    const handleSaveAlarm = (e: React.FormEvent) => {
        e.preventDefault();
        const newAlarm = {
            time: inputTime,
            title: inputTitle || 'Recordatorio',
            description: inputDescription
        };
        setAlarm(newAlarm);
        localStorage.setItem('alarmData', JSON.stringify(newAlarm));
        localStorage.removeItem('alarmTime'); // Clean up old version
        primeAudio(); // Prime audio on save as well
        setIsModalOpen(false);
        setStep(1); // Reset to step 1 for next time
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Alarma programada para las ${inputTime}`,
            showConfirmButton: false,
            timer: 3000
        });
    };

    const handleCancelAlarm = () => {
        setAlarm(null);
        localStorage.removeItem('alarmData');
        localStorage.removeItem('alarmTime');
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: 'Alarma cancelada',
            showConfirmButton: false,
            timer: 2000
        });
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setStep(1); // Reset to step 1 when closing
    };

    return (
        <div className="relative flex flex-col items-center">
            <button
                onClick={() => {
                    setIsModalOpen(true);
                    primeAudio();
                }}
                className={`relative p-2 rounded-full hover:bg-white/10 transition-colors ${alarm ? 'text-white' : 'text-indigo-100'}`}
                title={alarm ? `Alarma: ${alarm.title} (${alarm.time})` : 'Configurar Alarma'}
            >
                <Clock className={isRinging ? 'animate-bounce text-yellow-400' : ''} />
                {alarm && !isRinging && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-indigo-500"></span>
                )}
            </button>
            <span className="text-sm text-indigo-100 mt-1 font-medium tracking-wide cursor-pointer hover:text-white transition-colors hover:bg-white/10 rounded-full px-2 py-1"
                onClick={() => {
                    setIsModalOpen(true);
                    primeAudio();
                }}>
                {alarm ? timeRemaining : 'Set an alarm'}
            </span>

            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-between text-white">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Clock size={24} /> {step === 1 ? 'Seleccionar Hora' : 'Detalles del Recordatorio'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {step === 1 ? (
                            <form onSubmit={handleNextStep} className="p-8">
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="mb-4 bg-indigo-50 py-2 px-4 rounded-xl inline-block border border-indigo-100">
                                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Hora Actual</p>
                                            <p className="text-2xl font-mono font-bold text-indigo-600">
                                                {currentTimeData.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </p>
                                        </div>
                                        <label className="block text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                                            ¿A qué hora quieres el recordatorio?
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={inputTime}
                                            onChange={(e) => setInputTime(e.target.value)}
                                            className="text-5xl font-bold text-center w-full bg-white border-2 border-indigo-200 rounded-2xl px-4 py-6 focus:outline-none focus:border-indigo-500 text-slate-800 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col gap-3">
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        Siguiente →
                                    </button>

                                    {alarm && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleCancelAlarm();
                                                handleCloseModal();
                                            }}
                                            className="w-full py-3 bg-white border-2 border-slate-100 hover:border-red-100 hover:text-red-600 text-slate-600 font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <BellOff size={16} /> Cancelar Actual ({alarm.time})
                                        </button>
                                    )}
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleSaveAlarm} className="p-8">
                                <div className="space-y-6">
                                    <div className="text-center mb-4">
                                        <p className="text-sm text-slate-500">Alarma programada para</p>
                                        <p className="text-3xl font-bold text-indigo-600">{inputTime}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
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
                                            }}
                                            className="mt-2 text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                                        >
                                            <BellRing size={12} /> Probar sonido
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-2">
                                                <Type size={16} /> Título
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Reunión, Descanso..."
                                                value={inputTitle}
                                                onChange={(e) => setInputTitle(e.target.value)}
                                                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-2">
                                                <AlignLeft size={16} /> Descripción
                                            </label>
                                            <textarea

                                                placeholder="Opcional: Detalles del recordatorio..."
                                                value={inputDescription}
                                                onChange={(e) => setInputDescription(e.target.value)}
                                                rows={3}
                                                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col gap-3">
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        <BellRing size={20} /> Guardar Recordatorio
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full py-3 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 font-medium rounded-2xl transition-all"
                                    >
                                        ← Volver
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
