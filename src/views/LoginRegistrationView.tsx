import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { User, Fingerprint, Building2, Loader2, CheckCircle2, ShieldCheck, Phone, Mail, X, Copy, Check } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginRegistrationView() {
  const { setStudent, setToken } = useAppContext();
  
  const [name, setName] = useState('');
  const [matric, setMatric] = useState('');
  const [department, setDepartment] = useState('MBBS');
  const [phone, setPhone] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [matricError, setMatricError] = useState('');
  const [isShake, setIsShake] = useState(false);
  const navigate = useNavigate();

  const [isNewUser, setIsNewUser] = useState(false);

  // High IQ - Feature states
  const [phoneChallenge, setPhoneChallenge] = useState('');
  const [showChallenge, setShowChallenge] = useState(false);
  const [showEnrollPhone, setShowEnrollPhone] = useState(false);
  const [enrollPhoneInput, setEnrollPhoneInput] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [deviceId, setDeviceId] = useState('');

  // Concurrent Session Handling
  const [showConcurrentModal, setShowConcurrentModal] = useState(false);
  const [concurrentMessage, setConcurrentMessage] = useState('');
  const [activeLockMode, setActiveLockMode] = useState<'identity' | '2fa' | 'enroll' | null>(null);

  // Forgot Phone recovery feature states
  const [showForgotPhoneModal, setShowForgotPhoneModal] = useState(false);
  const [forgotEmailInput, setForgotEmailInput] = useState('');
  const [recoveredPhone, setRecoveredPhone] = useState<string | null>(null);
  const [isRecoveringPhone, setIsRecoveringPhone] = useState(false);
  const [phoneCopyStatus, setPhoneCopyStatus] = useState(false);

  const handleForgotPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailStr = forgotEmailInput.trim();
    if (!emailStr || !emailStr.includes('@') || !emailStr.includes('.')) {
      toast('Format Error', 'Please enter a valid email address.', 'error');
      return;
    }

    setIsRecoveringPhone(true);
    try {
      const res = await fetch('/api/auth/forgot-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailStr })
      });

      const data = await res.json();
      if (res.ok && data.phone) {
        setRecoveredPhone(data.phone);
        toast('Enrolled Cell Found', 'Verification matches! Phone number retrieved.', 'success');
      } else {
        if (res.status === 404 && data.error === 'email not found') {
          toast('Recovery Error', 'email not found', 'error');
        } else {
          toast('Recovery Error', data.error || 'Failed to retrieve phone number.', 'error');
        }
      }
    } catch {
      toast('Verify Error', 'Network connection collapsed. Please try again.', 'error');
    } finally {
      setIsRecoveringPhone(false);
    }
  };

  const handleCopyPhone = () => {
    if (!recoveredPhone) return;
    navigator.clipboard.writeText(recoveredPhone)
      .then(() => {
        setPhoneCopyStatus(true);
        toast('Copied', 'Phone number copied to clipboard!', 'success');
        setTimeout(() => setPhoneCopyStatus(false), 2000);
      })
      .catch(() => {
        toast('Copy Blocked', 'Clipboard copying rejected by security sandbox. Please copy manually.', 'info');
      });
  };

  const handlePrefillAndClose = () => {
    if (recoveredPhone) {
      setPhone(recoveredPhone);
      navigator.clipboard.writeText(recoveredPhone).catch(() => {});
      setShowForgotPhoneModal(false);
      toast('Ready to Login', 'Phone number loaded. Tap verify to login!', 'success');
    }
  };

  // Step 2: Fingerprint Generator (Canvas, UA, Screen traits)
  useEffect(() => {
    try {
      const elements = [
        navigator.userAgent,
        screen.width + "x" + screen.height,
        navigator.language,
        new Date().getTimezoneOffset().toString()
      ];
      const descriptor = elements.join("|");
      let hash = 0;
      for (let i = 0; i < descriptor.length; i++) {
        hash = (hash << 5) - hash + descriptor.charCodeAt(i);
        hash |= 0;
      }
      setDeviceId("TRM-" + Math.abs(hash).toString(16).toUpperCase());
    } catch {
      setDeviceId("TRM-" + Math.floor(Math.random() * 100000).toString(16).toUpperCase());
    }
  }, []);

  // Step 1: Lockout timer countdown
  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const interval = setInterval(() => {
      setRateLimitSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitSeconds]);

  const handleMatricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9/_ -]*$/.test(value)) {
      setMatric(value);
      setMatricError('');
    } else {
      setMatricError('Matric number has invalid characters');
    }
  };

  const handleVerifyIdentity = async (e?: React.FormEvent, forceOverride = false) => {
    if (e) e.preventDefault();
    if (matric.length < 5) {
      setMatricError('Valid matric number required (min 5 chars)');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      return;
    }
    if (!phone) {
      toast('Required', 'Please enter your phone number to login.', 'info');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = { 
        matric_no: matric, 
        phone: phone.trim(), 
        device_id: deviceId 
      };
      if (forceOverride) {
        payload.override_concurrency = true;
      }

      const res = await fetch('/api/auth/student-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data: any = {};
      try {
        if (text) {
          data = JSON.parse(text);
        }
      } catch (err) {
        console.error('Failed to parse JSON response:', text);
      }

      if (res.status === 429) {
        setRateLimitSeconds(data.secondsLeft || 45);
        toast('Rate Limit Gate', data.error || 'Temporary lockout.', 'error');
        setIsLoading(false);
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        return;
      }

      if (data && data.error === "CONCURRENT_EXAM_ACTIVE") {
        setConcurrentMessage(data.message || "Simultaneous browser logins or proxy exam operations are prohibited while an active terminal is open elsewhere.");
        setActiveLockMode('identity');
        setShowConcurrentModal(true);
        setIsLoading(false);
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        return;
      }

      if (res.ok && data.token) {
        setToken(data.token);
        setStudent({
          id: data.student_id,
          name: data.student ? data.student.name : name,
          email: data.student ? data.student.email : '',
          matric_no: matric,
          department: data.student ? data.student.department : department,
          phone: data.student ? data.student.phone : phone,
          strength: 'THEORY'
        });
        localStorage.setItem('FCF_Token', data.token);
        toast('Welcome', 'You have been successfully authenticated.', 'success');
        navigate('/dashboard');
      } else if (res.status === 400 && data.error && data.error.includes("Name, Department")) {
         setIsNewUser(true);
         toast('New Identity', 'Please complete your registration details.', 'info');
      } else {
        toast('Notice', data.error || 'Authentication Failed', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Verification Support', 'Handshake completed. Please check your Matric number format and connection and try again.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e?: React.FormEvent, forceOverride = false) => {
    if (e) e.preventDefault();
    if (!phoneChallenge) {
      toast('Security Digit Needed', 'Input security verification value.', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = { 
        matric_no: matric, 
        phone_challenge: phoneChallenge, 
        device_id: deviceId 
      };
      if (forceOverride) {
        payload.override_concurrency = true;
      }

      const res = await fetch('/api/auth/student-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data: any = {};
      try {
        if (text) {
          data = JSON.parse(text);
        }
      } catch (err) {
        console.error('Failed to parse JSON response:', text);
      }

      if (res.status === 429) {
        setRateLimitSeconds(data.secondsLeft || 45);
        toast('Rate Limit Gate', data.error || 'Temporary lockout.', 'error');
        setShowChallenge(false);
        setIsLoading(false);
        return;
      }

      if (data && data.error === "CONCURRENT_EXAM_ACTIVE") {
        setConcurrentMessage(data.message || "Simultaneous browser logins or proxy exam operations are prohibited while an active terminal is open elsewhere.");
        setActiveLockMode('2fa');
        setShowConcurrentModal(true);
        setIsLoading(false);
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        return;
      }

      if (res.ok && data.token) {
        setToken(data.token);
        setStudent({
          id: data.student_id,
          name: data.student ? data.student.name : name,
          email: data.student ? data.student.email : '',
          matric_no: matric,
          department: data.student ? data.student.department : department,
          phone: data.student ? data.student.phone : phone,
          strength: 'THEORY'
        });
        localStorage.setItem('FCF_Token', data.token);
        toast('Identity Verified', 'Multi-factor handshake completed successfully.', 'success');
        navigate('/dashboard');
      } else {
        toast('Handshake Cancelled', data.error || 'Two-factor profile verify failed.', 'error');
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
      }
    } catch {
      toast('Verification Support', 'Verification completed. Please check your credentials and retry.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollPhone = async (e?: React.FormEvent, forceOverride = false) => {
    if (e) e.preventDefault();
    if (!enrollPhoneInput || enrollPhoneInput.trim().replace(/[^0-9]/g, "").length < 6) {
      toast('Format Error', 'Please enter a valid phone number containing at least 6 digits.', 'error');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 505);
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = { 
        matric_no: matric, 
        phone: enrollPhoneInput.trim(), 
        device_id: deviceId 
      };
      if (forceOverride) {
        payload.override_concurrency = true;
      }

      const res = await fetch('/api/auth/student-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data: any = {};
      try {
        if (text) {
          data = JSON.parse(text);
        }
      } catch (err) {
        console.error('Failed to parse JSON response:', text);
      }

      if (res.status === 429) {
        setRateLimitSeconds(data.secondsLeft || 45);
        toast('Rate Limit Gate', data.error || 'Temporary lockout.', 'error');
        setShowEnrollPhone(false);
        setIsLoading(false);
        return;
      }

      if (data && data.error === "CONCURRENT_EXAM_ACTIVE") {
        setConcurrentMessage(data.message || "Simultaneous browser logins or proxy exam operations are prohibited while an active terminal is open elsewhere.");
        setActiveLockMode('enroll');
        setShowConcurrentModal(true);
        setIsLoading(false);
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        return;
      }

      if (res.ok && data.token) {
        setToken(data.token);
        setStudent({
          id: data.student_id,
          name: data.student ? data.student.name : name,
          email: data.student ? data.student.email : '',
          matric_no: matric,
          department: data.student ? data.student.department : department,
          phone: enrollPhoneInput.trim(),
          strength: 'THEORY'
        });
        localStorage.setItem('FCF_Token', data.token);
        toast('MFA Enrollment Secured', 'Your phone number was linked to your account. Welcome!', 'success');
        navigate('/dashboard');
      } else {
        toast('Activation Error', data.error || 'Failed to enroll phone number.', 'error');
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
      }
    } catch {
      toast('Verification Support', 'Verification completed. Please check your credentials and retry.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceOverrideLogin = async () => {
    setShowConcurrentModal(false);
    if (activeLockMode === 'identity') {
      await handleVerifyIdentity(undefined, true);
    } else if (activeLockMode === '2fa') {
      await handleVerify2FA(undefined, true);
    } else if (activeLockMode === 'enroll') {
      await handleEnrollPhone(undefined, true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showChallenge) {
      return handleVerify2FA(e);
    }
    if (showEnrollPhone) {
      return handleEnrollPhone(e);
    }
    if (!isNewUser) {
       return handleVerifyIdentity(e);
    }

    if (matric.length < 5) {
      setMatricError('Valid matric number required (min 5 chars)');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        matric_no: matric,
        name: name || undefined,
        department: department || undefined,
        phone: phone || undefined,
        device_id: deviceId
      };

      const res = await fetch('/api/auth/student-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse JSON response:', text);
        const errorDetail = res.status === 502 
          ? 'Server timed out or is unreachable. Please verify your MongoDB configurations.'
          : 'The server returned an invalid response.';
        toast('Server Error', errorDetail, 'error');
        setIsLoading(false);
        return;
      }
      
      if (res.ok && data.token) {
        setToken(data.token);
        setStudent({
          id: data.student_id,
          name: data.student ? data.student.name : name,
          email: data.student ? data.student.email : '',
          matric_no: matric,
          department: data.student ? data.student.department : department,
          phone: data.student ? data.student.phone : phone,
          strength: 'THEORY'
        });
        localStorage.setItem('FCF_Token', data.token);
        toast('Welcome', 'You have been successfully authenticated.', 'success');
        navigate('/dashboard');
      } else {
        const fallbackMsg = res.status >= 500 ? 'Server/Database error.' : 'Authentication Failed.';
        toast(res.status >= 500 ? 'Server Error' : 'Notice', data.error || fallbackMsg, res.status >= 500 ? 'error' : 'info');
      }
    } catch (e) {
      console.error(e);
      toast('Network Error', 'Could not reach the server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(37,99,235,0.05)_0%,_transparent_70%)]" />
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Identity verification Terminal */}
      <div className={`max-w-lg w-full academic-card bg-white dark:bg-[#0a0a0a]/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 border border-slate-200 dark:border-slate-800 ${isShake ? 'ring-2 ring-red-500 animate-shake' : ''}`}>
          
          <div className="p-6 sm:p-10">
            <div className="mb-8 space-y-2 text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight">PremedTestPortal</h2>
                <div className="h-1 w-12 bg-blue-600 mx-auto md:mx-0 rounded-full" />
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-200 uppercase tracking-widest mt-2">
                  Enter identity sequence to proceed
                </p>
             </div>

             {/* Dynamic Lockout Alert Badge */}
             {rateLimitSeconds > 0 && (
               <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-xs font-black uppercase tracking-wider animate-pulse mb-6 rounded-2xl">
                 <span className="text-lg">🔒</span>
                 <span>Security Lockout: Rate limit exceeded. Try again in {rateLimitSeconds}s.</span>
               </div>
             )}

             <form onSubmit={handleSubmit} className="space-y-6">
                
                {showChallenge ? (
                  /* Two-Factor Secure Challenge State */
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 rounded-xl text-xs space-y-1.5">
                      <p className="font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Verified MFA Check
                      </p>
                      <p className="opacity-80 text-[10px] leading-relaxed">
                        To continue safely, enter either your full registered phone number or the last 4 digits (ending in <span className="font-bold underline font-mono text-xs">{maskedPhone}</span>) to unlock your terminal.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-100">
                          Confirm Registered Cell Digits
                       </label>
                       <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Phone size={16} />
                         </div>
                         <input 
                           type="text" 
                           required
                           disabled={rateLimitSeconds > 0}
                           value={phoneChallenge}
                           onChange={(e) => setPhoneChallenge(e.target.value)}
                           className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-black border rounded-xl text-sm font-mono tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-all shadow-sm border-slate-200 dark:border-slate-800 focus:ring-blue-500/50 focus:border-blue-500"
                           placeholder="e.g. Last 4 phone digits"
                         />
                       </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                       <button 
                         type="button"
                         onClick={() => {
                           setShowChallenge(false);
                           setPhoneChallenge('');
                         }}
                         className="w-1/3 py-3.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                       >
                         Back
                       </button>
                       <button 
                         type="submit"
                         disabled={isLoading || rateLimitSeconds > 0 || phoneChallenge.length < 4}
                         className="flex-grow py-3.5 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-500 transition-all disabled:opacity-50"
                       >
                         {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Confirm Handshake</>}
                       </button>
                    </div>
                  </div>
                ) : showEnrollPhone ? (
                  /* Phone Enrollment setup (Help flow) code */
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs space-y-1.5 leading-relaxed">
                      <p className="font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> 📱 Account Security Match
                      </p>
                      <p className="opacity-80 text-[10px]">
                        Many profiles are missing a registered phone number. To secure your exam, please enroll your phone number now (one-time setup). In future logins, you will verify using only its last 4 digits.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-100">
                          Enroll Full Mobile Number
                       </label>
                       <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Phone size={16} />
                         </div>
                         <input 
                           type="text" 
                           required
                           disabled={rateLimitSeconds > 0}
                           value={enrollPhoneInput}
                           onChange={(e) => setEnrollPhoneInput(e.target.value)}
                           className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-black border rounded-xl text-sm font-mono tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-all shadow-sm border-slate-200 dark:border-slate-800 focus:ring-blue-500/50 focus:border-blue-500"
                           placeholder="e.g. 080..."
                         />
                       </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                       <button 
                         type="button"
                         onClick={() => {
                           setShowEnrollPhone(false);
                           setEnrollPhoneInput('');
                         }}
                         className="w-1/3 py-3.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-bold"
                       >
                         Back
                       </button>
                       <button 
                         type="submit"
                         disabled={isLoading || rateLimitSeconds > 0 || enrollPhoneInput.length < 6}
                         className="flex-grow py-3.5 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-emerald-500 transition-all disabled:opacity-50"
                       >
                         {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Secure Phone & Login</>}
                       </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Matric Identity Block */
                  <>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-100 flex justify-between">
                            <span>Unique Matric Number</span>
                            {matricError && <span className="text-red-550">{matricError}</span>}
                         </label>
                         <div className="relative">
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                              <Fingerprint size={16} />
                           </div>
                           <input 
                             type="text" 
                             required
                             disabled={rateLimitSeconds > 0}
                             value={matric}
                             onChange={handleMatricChange}
                             className={`w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-black border rounded-xl text-sm font-mono font-black tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-all shadow-sm ${matricError ? 'border-red-400 focus:ring-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-blue-500/50 focus:border-blue-500'}`}
                             placeholder="e.g. BNS/SET02/250/123"
                           />
                           <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {isLoading && <Loader2 size={16} className="animate-spin text-blue-500" />}
                              {matric.length >= 5 && !matricError && <CheckCircle2 size={18} className="text-emerald-500" />}
                           </div>
                         </div>
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-100 flex justify-between items-center select-none">
                            <span>Phone Number</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                setForgotEmailInput('');
                                setRecoveredPhone(null);
                                setShowForgotPhoneModal(true);
                              }}
                              className="text-[9px] font-bold text-blue-500 dark:text-blue-400 hover:underline hover:text-blue-600 dark:hover:text-blue-300 transition-colors uppercase tracking-wider cursor-pointer"
                            >
                              Forgot cell?
                            </button>
                         </label>
                         <div className="relative">
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                              <Phone size={16} />
                           </div>
                           <input 
                             type="text" 
                             required
                             disabled={rateLimitSeconds > 0}
                             value={phone}
                             onChange={(e) => setPhone(e.target.value)}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-black tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                             placeholder="e.g. 080..."
                           />
                         </div>
                      </div>
                    </div>

                    {isNewUser && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6 mt-6">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-100 font-serif">Full Name</label>
                           <div className="relative">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <User size={16} />
                             </div>
                             <input 
                               type="text" 
                               required
                               disabled={rateLimitSeconds > 0}
                               value={name}
                               onChange={(e) => setName(e.target.value)}
                               className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-black border rounded-xl text-sm font-black tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-all shadow-sm border-slate-200 dark:border-slate-800 focus:ring-blue-500/50 focus:border-blue-500"
                               placeholder="Full Name"
                             />
                           </div>
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-100">Department</label>
                           <div className="relative">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Building2 size={16} />
                             </div>
                             <select 
                               value={department}
                               disabled={rateLimitSeconds > 0}
                               onChange={e => setDepartment(e.target.value)}
                               className="w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold uppercase text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm appearance-none"
                             >
                               <option value="MBBS">MBBS</option>
                               <option value="Pharmacy">Pharmacy</option>
                               <option value="Pharmacology">Pharmacology</option>
                               <option value="Medical Lab Science">Medical Lab Science</option>
                               <option value="Nursing">Nursing</option>
                               <option value="Nursing NACON">Nursing NACON</option>
                               <option value="Physiotherapy">Physiotherapy</option>
                               <option value="Radiography">Radiography</option>
                               <option value="Anatomy">Anatomy</option>
                               <option value="Physiology">Physiology</option>
                               <option value="Dentistry">Dentistry</option>
                               <option value="Biomedical Engineering">Biomedical Engineering</option>
                             </select>
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                             </div>
                           </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="pt-4">
                       <button 
                         type="submit"
                         disabled={isLoading || rateLimitSeconds > 0 || matric.length < 5}
                         className="w-full py-4 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-600/20 hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                       >
                         {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> {isNewUser ? 'Complete Registration' : 'Verify & Continue'}</>}
                       </button>
                    </div>
                  </>
                )}
             </form>

             <div className="mt-8 text-center pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/login')}
                  className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Admin Access
                </button>
                <div className="text-xs md:text-sm font-medium text-slate-400 dark:text-slate-300">
                  Built by Maximus, DOS
                </div>
             </div>

          </div>
        </div>

        {/* Forgot Phone Modal Interface Option */}
        <AnimatePresence>
          {showForgotPhoneModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-md w-full bg-white dark:bg-[#080808] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
              >
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                    Security Access Control
                  </span>
                  <button 
                    onClick={() => setShowForgotPhoneModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-705 dark:hover:text-slate-100 bg-slate-50 dark:bg-[#111] border border-slate-200/40 dark:border-slate-800/60 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                  {!recoveredPhone ? (
                    /* Form requesting email */
                    <form onSubmit={handleForgotPhoneSubmit} className="space-y-4 pt-1">
                      <div className="text-center space-y-1.5 mb-2">
                        <div className="mx-auto w-10 h-10 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                          <Phone size={18} className="animate-pulse" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Retrieve Contact Info</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                          Input your registered recovery email address to retrieve your enrolled phone number.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                          Registered Email Address
                        </label>
                        <div className="relative text-left">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 border-none">
                            <Mail size={15} />
                          </div>
                          <input 
                            type="email"
                            required
                            placeholder="e.g. name@example.com"
                            value={forgotEmailInput}
                            onChange={(e) => setForgotEmailInput(e.target.value)}
                            disabled={isRecoveringPhone}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isRecoveringPhone || !forgotEmailInput.trim()}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        {isRecoveringPhone ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" /> Verifying...
                          </span>
                        ) : (
                          "Recover Phone Number"
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Success View showing phone details block */
                    <div className="space-y-5 text-center">
                      <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                        <CheckCircle2 size={24} />
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Profile Retrieved</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Your registered cell digits are shown below:
                        </p>
                      </div>

                      {/* Displays phone format clearly */}
                      <div className="p-4 bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80 rounded-xl flex items-center justify-between gap-3 font-mono">
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">RECOVERY PHONE NUMBER</span>
                          <span className="text-base font-black text-blue-600 dark:text-blue-400 select-all tracking-wider md:text-lg truncate block">{recoveredPhone}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={handleCopyPhone}
                          className="p-2.5 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-300 hover:text-blue-600 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                          title="Copy to clipboard"
                        >
                          {phoneCopyStatus ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          type="button"
                          onClick={() => setRecoveredPhone(null)}
                          className="w-1/3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          Back
                        </button>
                        <button 
                          type="button"
                          onClick={handlePrefillAndClose}
                          className="flex-grow py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
                        >
                          Copy & Prefill
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
          
          {showConcurrentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-md w-full bg-white dark:bg-[#080808] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
              >
                <div className="px-5 py-4 border-b border-slate-100 dark:border-[#111] flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                    Terminal Session Conflict
                  </span>
                  <button 
                    onClick={() => setShowConcurrentModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-705 dark:hover:text-slate-100 bg-slate-50 dark:bg-[#111] border border-slate-200/40 dark:border-slate-800/60 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                  <div className="text-center space-y-3">
                    <div className="mx-auto w-12 h-12 bg-amber-500/10 text-amber-505 rounded-2xl flex items-center justify-center">
                      <Fingerprint size={24} className="text-amber-500 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Connection Preempted</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                        Simultaneous browser logins or multiple candidate test terminals are highly restricted.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 dark:border-amber-500/20 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block font-mono">🔒 Session Lock Active</span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-mono">
                      {concurrentMessage || "An active test session was identified on another browser terminal. To prevent session hijacking and concurrent cheating workflows, the secure interface requires explicit manual handoff validation."}
                    </p>
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-normal italic">
                    Caution: Initiating a terminal transfer will automatically detach the other active terminal session and securely re-anchor your current token state to this browser tab.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowConcurrentModal(false)}
                      className="w-1/3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 tracking-tight transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleForceOverrideLogin}
                      className="flex-grow py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase tracking-widest text-[9px] rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
                    >
                      Override & Force Transfer
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
  );
}
