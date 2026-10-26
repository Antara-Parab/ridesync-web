'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, MapPin, Clock, Users, CheckCircle, 
  AlertCircle, Search, PlusCircle, Check, X, 
  ArrowRight, ShieldCheck, Tag, Sparkles, Phone,
  TrendingDown, CheckSquare, Square, LogIn, UserPlus,
  LogOut, User, Lock, ChevronRight, Zap, Trash2, Loader2,
  Database, RefreshCw, Table, Layers, Star, Flag, ExternalLink
} from 'lucide-react';

interface Ride {
  ride_id: number;
  driver_name: string;
  driver_phone: string;
  vehicle_model: string;
  vehicle_number: string;
  source: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  cost_per_seat: number;
}

interface Booking {
  booking_id: number;
  ride_id: number;
  driver_name?: string;
  passenger_name: string;
  passenger_phone: string;
  source: string;
  destination: string;
  departure_time: string;
  seats_requested: number;
  has_student_discount: boolean;
  total_fare: number;
  discounted_fare: number;
  booking_status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  booked_at: string;
}

interface AuthUser {
  user_id: number;
  username: string;
  full_name: string;
}

export default function CampusPoolApp() {
  // Application state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [isBookingSeat, setIsBookingSeat] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(null);

  const [adminTables, setAdminTables] = useState<Record<string, any[]> | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminActiveTable, setAdminActiveTable] = useState<string>('all');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'find' | 'offer' | 'bookings'>('find');
  const [myRidesSubTab, setMyRidesSubTab] = useState<'passenger' | 'driver'>('passenger');
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [searchSource, setSearchSource] = useState('');
  const [searchDest, setSearchDest] = useState('');
  const sourceInputRef = useRef<HTMLInputElement>(null);

  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [passengerNameInput, setPassengerNameInput] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('9820445566');
  const [requestedSeats, setRequestedSeats] = useState(1);
  const [applyStudentDiscount, setApplyStudentDiscount] = useState(true);

  const [ratingModalBooking, setRatingModalBooking] = useState<Booking | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingReview, setRatingReview] = useState<string>('Great safe driving, reached campus on time!');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<number, { rating_value: number; review?: string }>>({});

  const [newRideForm, setNewRideForm] = useState<{
    driver_name: string;
    driver_phone: string;
    vehicle_model: string;
    vehicle_number: string;
    source: string;
    destination: string;
    departure_time: string;
    available_seats: number | string;
    cost_per_seat: number | string;
  }>({
    driver_name: '',
    driver_phone: '9820112233',
    vehicle_model: 'Hyundai i20',
    vehicle_number: '',
    source: '',
    destination: 'VESIT Campus',
    departure_time: '',
    available_seats: 3,
    cost_per_seat: 50,
  });

  // Format vehicle number plate
  const formatVehicleNumber = (val: string): string => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    if (!clean) return '';

    let res = '';
    let i = 0;
    while (i < clean.length && i < 2 && /[A-Z]/.test(clean[i])) {
      res += clean[i];
      i++;
    }
    if (i >= clean.length) return res;

    res += '-';
    let rtoCount = 0;
    while (i < clean.length && rtoCount < 2 && /[0-9]/.test(clean[i])) {
      res += clean[i];
      i++;
      rtoCount++;
    }
    if (i >= clean.length) return res;

    res += '-';
    let seriesCount = 0;
    while (i < clean.length && seriesCount < 2 && /[A-Z]/.test(clean[i])) {
      res += clean[i];
      i++;
      seriesCount++;
    }
    if (i >= clean.length) return res;

    res += '-';
    let numCount = 0;
    while (i < clean.length && numCount < 4 && /[0-9]/.test(clean[i])) {
      res += clean[i];
      i++;
      numCount++;
    }

    return res;
  };

  const handleVehicleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    let raw = inputVal;
    if (newRideForm.vehicle_number.endsWith('-') && inputVal === newRideForm.vehicle_number.slice(0, -1)) {
      raw = inputVal.slice(0, -1);
    }
    const formatted = formatVehicleNumber(raw);
    setNewRideForm(prev => ({ ...prev, vehicle_number: formatted }));
  };

  // Format 24-hour departure time
  const format24HourTime = (val: string): string => {
    if (val.includes(':')) {
      const parts = val.split(':');
      let h = parts[0].replace(/[^0-9]/g, '').slice(0, 2);
      let m = parts[1].replace(/[^0-9]/g, '').slice(0, 2);
      if (!h && !m) return '';
      if (h) {
        const hNum = Math.min(23, parseInt(h, 10));
        h = String(hNum).padStart(2, '0');
      }
      if (m) {
        let mNum = parseInt(m, 10);
        if (m.length === 1 && mNum > 5) mNum = 5;
        else if (m.length === 2 && mNum > 59) mNum = 59;
        m = String(mNum);
      }
      return h ? (m !== '' ? h + ':' + m : h + ':') : '';
    }

    const digits = val.replace(/[^0-9]/g, '').slice(0, 4);
    if (!digits) return '';

    if (digits.length === 1) {
      const d = parseInt(digits, 10);
      if (d >= 3) return '0' + d + ':';
      return digits;
    }

    if (digits.length === 2) {
      const hours = Math.min(23, parseInt(digits, 10));
      return String(hours).padStart(2, '0') + ':';
    }

    const hours = Math.min(23, parseInt(digits.slice(0, 2), 10));
    const hStr = String(hours).padStart(2, '0');
    let m1 = parseInt(digits[2], 10);
    if (m1 > 5) m1 = 5;
    if (digits.length === 3) {
      return hStr + ':' + m1;
    }
    const m2 = parseInt(digits[3], 10);
    return hStr + ':' + m1 + m2;
  };

  const handleDepartureTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    let raw = inputVal;
    if (newRideForm.departure_time.endsWith(':') && inputVal === newRideForm.departure_time.slice(0, -1)) {
      raw = inputVal.slice(0, -1);
    }
    const formatted = format24HourTime(raw);
    setNewRideForm(prev => ({ ...prev, departure_time: formatted }));
  };

  // Form input handlers
  const handleSeatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setNewRideForm(prev => ({ ...prev, available_seats: '' }));
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num <= 0) {
        setNewRideForm(prev => ({ ...prev, available_seats: '' }));
      } else {
        setNewRideForm(prev => ({ ...prev, available_seats: Math.min(6, num) }));
      }
    }
  };

  const handleSeatsFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (newRideForm.available_seats === 0 || newRideForm.available_seats === '0') {
      setNewRideForm(prev => ({ ...prev, available_seats: '' }));
    } else {
      e.target.select();
    }
  };

  const handleSeatsBlur = () => {
    if (newRideForm.available_seats === '' || Number(newRideForm.available_seats) < 1) {
      setNewRideForm(prev => ({ ...prev, available_seats: 1 }));
    }
  };

  const handleRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setNewRideForm(prev => ({ ...prev, cost_per_seat: '' }));
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setNewRideForm(prev => ({ ...prev, cost_per_seat: val }));
    }
  };

  const handleRentFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (newRideForm.cost_per_seat === 0 || newRideForm.cost_per_seat === '0') {
      setNewRideForm(prev => ({ ...prev, cost_per_seat: '' }));
    } else {
      e.target.select();
    }
  };

  const handleRentBlur = () => {
    if (newRideForm.cost_per_seat === '') {
      setNewRideForm(prev => ({ ...prev, cost_per_seat: 0 }));
    }
  };

  // User presets
  const applyUserPreset = (username: string) => {
    const clean = username.trim().toLowerCase();
    if (clean === 'tanmay') {
      setNewRideForm({
        driver_name: clean,
        driver_phone: '9820112233',
        vehicle_model: 'Honda Amaze',
        vehicle_number: 'MH-04-KR-9798',
        source: 'Thane',
        destination: 'VESIT Campus',
        departure_time: '07:30',
        available_seats: 1,
        cost_per_seat: 67,
      });
    } else {
      setNewRideForm(prev => ({
        ...prev,
        driver_name: clean,
      }));
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Initial data load
  useEffect(() => {
    const savedUser = localStorage.getItem('campuspool_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        if (parsed?.username) {
          setPassengerNameInput(parsed.username);
          applyUserPreset(parsed.username);
        }
      } catch {
        localStorage.removeItem('campuspool_user');
      }
    } else {
      setPassengerNameInput('');
    }
    fetchRides();
    fetchBookings();
    fetchRatings();
  }, []);

  // Fetch available rides
  const fetchRides = async () => {
    try {
      let url = '/api/rides';
      const params = new URLSearchParams();
      if (searchSource) params.append('source', searchSource);
      if (searchDest) params.append('destination', searchDest);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRides(data.rides);
      }
    } catch {
      console.error('Failed to load rides');
    }
  };

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch {
      console.error('Failed to load bookings');
    }
  };

  // Fetch ratings
  const fetchRatings = async () => {
    try {
      const res = await fetch('/api/ratings');
      const data = await res.json();
      if (data.success && Array.isArray(data.ratings)) {
        const ratingMap: Record<number, { rating_value: number; review?: string }> = {};
        data.ratings.forEach((r: any) => {
          if (r.booking_id) {
            ratingMap[Number(r.booking_id)] = {
              rating_value: Number(r.rating_value) || 5,
              review: r.review,
            };
          }
        });
        setUserRatings(ratingMap);
      }
    } catch {
      console.error('Failed to load ratings');
    }
  };

  // Fetch live TiDB admin tables
  const fetchAdminTables = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.success) {
        setAdminTables(data.tables);
        setLastRefreshedAt(new Date().toLocaleTimeString());
        showToast('Live tables refreshed from TiDB database!', 'success');
      } else {
        showToast(data.error || 'Failed to fetch database tables', 'error');
      }
    } catch {
      showToast('Network error while refreshing tables', 'error');
    } finally {
      setAdminLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (currentUser?.username?.toLowerCase() === 'admin') {
      fetchAdminTables();
    }
  }, [currentUser]);

  // Render admin table rows
  const renderTableData = (tableName: string, data: any[] | undefined) => {
    const rows = data || [];
    if (rows.length === 0) {
      return (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Database className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Table `{tableName}` has 0 records</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Records created in the app will appear here in real-time.</p>
        </div>
      );
    }

    const columns = Object.keys(rows[0]);

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2.5 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                {columns.map((col) => {
                  const val = row[col];
                  let displayVal: React.ReactNode = String(val ?? 'NULL');

                  if (typeof val === 'string' && val.includes('T') && val.includes('Z')) {
                    displayVal = new Date(val).toLocaleString();
                  }

                  if (col.toLowerCase().includes('status') && typeof val === 'string') {
                    const status = val.toUpperCase();
                    const colorClass = 
                      status === 'ACTIVE' || status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      status === 'PENDING' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      status === 'REJECTED' || status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                      'bg-slate-100 text-slate-700 border-slate-200';
                    displayVal = (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
                        {status}
                      </span>
                    );
                  }

                  if (col.toLowerCase().endsWith('_id') && val != null) {
                    displayVal = <span className="font-mono text-slate-600 font-bold">#{val}</span>;
                  }

                  if ((col.toLowerCase().includes('fare') || col.toLowerCase().includes('cost')) && val != null) {
                    displayVal = <span className="font-bold text-emerald-700">₹{Number(val).toFixed(2)}</span>;
                  }

                  if (col.toLowerCase().includes('seats') && val != null) {
                    displayVal = <span className="font-bold text-slate-900">{val} seat{Number(val) === 1 ? '' : 's'}</span>;
                  }

                  return (
                    <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {val === null || val === undefined ? (
                        <span className="italic text-slate-400">NULL</span>
                      ) : (
                        displayVal
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // User authentication
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      showToast('Please enter both username and password', 'error');
      return;
    }

    setAuthLoading(true);
    const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        setPassengerNameInput(data.user.username);
        applyUserPreset(data.user.username);
        localStorage.setItem('campuspool_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        showToast(data.message, 'success');
        setAuthUsername('');
        setAuthPassword('');
      } else {
        showToast(data.error || 'Authentication failed', 'error');
      }
    } catch {
      showToast('Connection error, please try again', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('campuspool_user');
    setPassengerNameInput('');
    setAdminTables(null);
    setAdminActiveTable('all');
    setNewRideForm({
      driver_name: '',
      driver_phone: '9820112233',
      vehicle_model: 'Hyundai i20',
      vehicle_number: '',
      source: '',
      destination: 'VESIT Campus',
      departure_time: '',
      available_seats: 3,
      cost_per_seat: 50,
    });
    showToast('Logged out successfully', 'info');
  };

  // Open booking modal
  const handleOpenBookingModal = (ride: Ride) => {
    if (!currentUser) {
      showToast('Please log in with your student account to book a seat!', 'info');
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    if (ride.driver_name?.toLowerCase() === currentUser.username.toLowerCase()) {
      showToast('⚠️ You cannot book a seat on your own ride! You are the driver.', 'error');
      return;
    }
    const currentName = currentUser.username.toLowerCase();
    const alreadyBooked = bookings.some(
      b => b.ride_id === ride.ride_id &&
           (b.passenger_name || '').toLowerCase() === currentName &&
           (b.booking_status === 'PENDING' || b.booking_status === 'ACCEPTED')
    );
    if (alreadyBooked) {
      showToast('⚠️ You have already applied or booked a seat for this carpool ride!', 'info');
      return;
    }
    setSelectedRide(ride);
    setRequestedSeats(1);
    setPassengerNameInput(currentUser.username);
  };

  // Confirm booking request
  const handleConfirmBooking = async () => {
    if (!selectedRide) return;

    if (currentUser && selectedRide.driver_name?.toLowerCase() === currentUser.username.toLowerCase()) {
      showToast('⚠️ You cannot book a seat on your own ride! You are the driver.', 'error');
      setSelectedRide(null);
      return;
    }

    if (requestedSeats > selectedRide.available_seats) {
      showToast(`⚠️ Only ${selectedRide.available_seats} seat(s) available on this ride! You selected ${requestedSeats}.`, 'error');
      return;
    }

    const bookerName = currentUser?.username || passengerNameInput.trim() || 'Student Passenger';
    setIsBookingSeat(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_id: selectedRide.ride_id,
          passenger_name: bookerName,
          passenger_phone: passengerPhone,
          seats_requested: requestedSeats,
          apply_student_discount: applyStudentDiscount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setSelectedRide(null);
        fetchBookings();
        fetchRides();
        setMyRidesSubTab('passenger');
        setActiveTab('bookings');
      } else {
        showToast(data.error || 'Failed to submit booking', 'error');
      }
    } catch {
      showToast('Network error, please try again.', 'error');
    } finally {
      setIsBookingSeat(false);
    }
  };

  // Offer a new carpool ride
  const handleOfferRide = async (e: React.FormEvent) => {
    e.preventDefault();
    const driverName = (currentUser ? currentUser.username : newRideForm.driver_name).trim().toLowerCase();

    if (!driverName) {
      showToast('Please enter your name or log in first!', 'error');
      return;
    }

    if (!newRideForm.source.trim() || !newRideForm.destination.trim()) {
      showToast('Please fill in pickup and drop locations', 'error');
      return;
    }

    if (!newRideForm.departure_time.trim() || newRideForm.departure_time.length < 4) {
      showToast('Please enter a valid 24-hour departure time (e.g. 08:30 or 14:15)', 'error');
      return;
    }

    const seatsNum = Number(newRideForm.available_seats);
    if (!seatsNum || seatsNum < 1) {
      showToast('⚠️ Seats available must be at least 1! You cannot offer 0 seats.', 'error');
      return;
    }

    const fareNum = newRideForm.cost_per_seat === '' ? 0 : Number(newRideForm.cost_per_seat);
    setIsSubmittingRide(true);

    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRideForm,
          available_seats: seatsNum,
          cost_per_seat: fareNum,
          driver_name: driverName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('🎉 Your carpool ride has been published to the database!', 'success');
        if (currentUser?.username) {
          applyUserPreset(currentUser.username);
        } else {
          setNewRideForm({
            driver_name: '',
            driver_phone: '9820112233',
            vehicle_model: 'Hyundai i20',
            vehicle_number: '',
            source: '',
            destination: 'VESIT Campus',
            departure_time: '',
            available_seats: 3,
            cost_per_seat: 50,
          });
        }
        fetchRides();
        setActiveTab('find');
      } else {
        showToast(data.error || 'Failed to offer ride', 'error');
      }
    } catch {
      showToast('Failed to post ride. Please check network.', 'error');
    } finally {
      setIsSubmittingRide(false);
    }
  };

  // Accept booking request
  const handleAcceptRequest = async (bookingId: number) => {
    setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, booking_status: 'ACCEPTED' } : b));
    setActionLoadingId(bookingId);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/accept`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        fetchBookings();
        fetchRides();
      } else {
        showToast(data.error || 'Could not accept booking', 'error');
        fetchBookings();
      }
    } catch {
      showToast('Action failed', 'error');
      fetchBookings();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject booking request
  const handleRejectRequest = async (bookingId: number) => {
    setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, booking_status: 'REJECTED' } : b));
    setActionLoadingId(bookingId);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/reject`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Booking request declined.', 'info');
        fetchBookings();
      } else {
        showToast(data.error || 'Could not decline booking', 'error');
        fetchBookings();
      }
    } catch {
      showToast('Action failed', 'error');
      fetchBookings();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete offered ride
  const handleDeleteRide = async (rideId: number) => {
    if (!confirm('Are you sure you want to delete this offered carpool ride?')) return;
    
    const previousRides = [...rides];
    setRides(prev => prev.filter(r => r.ride_id !== rideId));
    setActionLoadingId(rideId);

    try {
      const res = await fetch(`/api/rides?id=${rideId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Carpool ride deleted from database!', 'success');
        fetchRides();
        fetchBookings();
      } else {
        setRides(previousRides);
        showToast(data.error || 'Failed to delete ride', 'error');
      }
    } catch {
      setRides(previousRides);
      showToast('Network error while deleting ride', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Clear all bookings
  const handleClearAllBookings = async () => {
    try {
      const res = await fetch('/api/bookings', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Cleaned! All test bookings cleared from database.', 'success');
        fetchBookings();
        fetchRides();
      } else {
        showToast(data.error || 'Failed to clear bookings', 'error');
      }
    } catch {
      showToast('Network error while clearing bookings', 'error');
    }
  };

  // Complete ride and record audit log
  const handleCompleteRide = async (rideId: number) => {
    setActionLoadingId(rideId);
    try {
      const res = await fetch('/api/rides/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ride_id: rideId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('🏁 Trip completed! Status audit saved to Ride_Logs table.', 'success');
        fetchRides();
        fetchBookings();
      } else {
        showToast(data.error || 'Failed to complete trip', 'error');
      }
    } catch {
      showToast('Network error while completing ride', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit driver rating
  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingModalBooking) return;
    setIsSubmittingRating(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: ratingModalBooking.booking_id,
          rating_value: ratingValue,
          review: ratingReview,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('⭐ Driver rated successfully! Record saved to Ratings table.', 'success');
        setUserRatings(prev => ({
          ...prev,
          [ratingModalBooking.booking_id]: {
            rating_value: ratingValue,
            review: ratingReview,
          },
        }));
        setRatingModalBooking(null);
        fetchRatings();
      } else {
        showToast(data.error || 'Failed to submit rating', 'error');
      }
    } catch {
      showToast('Network error while submitting rating', 'error');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Ride price calculation
  const unitPrice = selectedRide ? Number(selectedRide.cost_per_seat) : 0;
  const baseFare = requestedSeats * unitPrice;
  const discountAmount = applyStudentDiscount ? baseFare * 0.10 : 0;
  const finalFare = baseFare - discountAmount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-bounce-short">
          <div className={`p-4 rounded-xl shadow-xl border flex items-start space-x-3 ${
            toast.type === 'success' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' :
            toast.type === 'error' ? 'bg-rose-900 text-rose-100 border-rose-700' :
            'bg-slate-900 text-slate-100 border-slate-700'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
            <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">

          <div 
            onClick={() => setActiveTab('find')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">CampusPool</span>
              </div>
              <p className="text-[11px] text-slate-500">Student Carpool & Seat Sharing</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {currentUser?.username?.toLowerCase() === 'admin' ? (
              <div className="flex items-center space-x-2">
                <a
                  href="https://tidbcloud.com/tidbs/10308908932266543723/sqleditor?orgId=1372813089209377702"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 border border-purple-200 text-xs font-bold transition shadow-xs cursor-pointer group"
                  title="Open TiDB Cloud SQL Editor in new tab"
                >
                  <Database className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition" />
                  <span>TiDB Live Tables</span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-purple-600 transition" />
                </a>
                <button
                  type="button"
                  onClick={fetchAdminTables}
                  disabled={adminLoading}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Refresh Database Tables"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                  <span>{adminLoading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            ) : (
              <nav className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('find')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                    activeTab === 'find' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find Ride</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('offer')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                    activeTab === 'offer' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Offer Ride</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                    activeTab === 'bookings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>My Rides</span>
                  {bookings.filter(b => b.booking_status === 'PENDING').length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              </nav>
            )}

            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  currentUser.username.toLowerCase() === 'admin'
                    ? 'bg-purple-100 border border-purple-300 text-purple-900'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                }`}>
                  <User className={`w-3.5 h-3.5 ${currentUser.username.toLowerCase() === 'admin' ? 'text-purple-600' : 'text-emerald-600'}`} />
                  <span>{currentUser.username}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center space-x-1"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {currentUser?.username?.toLowerCase() === 'admin' ? (
          
          
          
          <div className="space-y-6">

            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-purple-500/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex items-center space-x-1.5 bg-purple-500/20 text-purple-300 text-xs px-2.5 py-1 rounded-full font-bold border border-purple-400/30">
                    <Database className="w-3.5 h-3.5" />
                    <span>TiDB Serverless Live Database</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Connected</span>
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Database Live Tables</h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-1">
                  Real-time direct view of all live tables in TiDB database <code className="text-purple-300 bg-purple-900/50 px-1.5 py-0.5 rounded">ridesync_db</code>.
                  {lastRefreshedAt && <span className="ml-2 text-slate-400 font-mono text-xs">(Last refreshed: {lastRefreshedAt})</span>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href="https://tidbcloud.com/tidbs/10308908932266543723/sqleditor?orgId=1372813089209377702"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 px-4 py-2.5 bg-purple-600/90 hover:bg-purple-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-600/20 transition cursor-pointer active:scale-95 border border-purple-400/30"
                  title="Open TiDB Cloud SQL Editor in new tab"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Open TiDB SQL Editor</span>
                  <ExternalLink className="w-3 h-3 text-purple-200" />
                </a>
                <button
                  type="button"
                  onClick={fetchAdminTables}
                  disabled={adminLoading}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                  <span>{adminLoading ? 'Refreshing Tables...' : 'Refresh Tables'}</span>
                </button>
              </div>
            </div>

            {(() => {
              const tableNames = ['Users', 'Vehicles', 'Rides', 'Bookings', 'Ratings', 'Ride_Logs'];
              const displayedTables = adminActiveTable === 'all' 
                ? tableNames 
                : tableNames.filter((t) => t === adminActiveTable);

              return (
                <>
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                    <button
                      type="button"
                      onClick={() => setAdminActiveTable('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        adminActiveTable === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>All Tables (6)</span>
                    </button>
                    {tableNames.map((tbl) => {
                      const count = adminTables?.[tbl]?.length ?? 0;
                      const isSelected = adminActiveTable === tbl;
                      return (
                        <button
                          key={tbl}
                          type="button"
                          onClick={() => setAdminActiveTable(tbl)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <Table className="w-3.5 h-3.5" />
                          <span>{tbl}</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            isSelected ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {adminLoading && !adminTables ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                      <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-800">Fetching live tables from TiDB...</h3>
                      <p className="text-xs text-slate-500 mt-1">Reading Users, Vehicles, Rides, Bookings, Ratings, Ride_Logs</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {displayedTables.map((tbl) => {
                        const rows = adminTables?.[tbl] || [];
                        return (
                          <div key={tbl} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                                  <Table className="w-4 h-4" />
                                </div>
                                <div>
                                  <h3 className="font-extrabold text-slate-900 text-sm">{tbl}</h3>
                                  <p className="text-[11px] text-slate-500">TiDB table: <code className="text-purple-700 font-mono">ridesync_db.{tbl}</code></p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200/70 text-slate-700">
                                  {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                                </span>
                              </div>
                            </div>
                            <div className="p-4">
                              {renderTableData(tbl, rows)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <>

            {/* Find Rides Tab */}
            {activeTab === 'find' && (
          <div className="space-y-6">

            <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center space-x-1 bg-emerald-700/60 text-emerald-200 text-xs px-2.5 py-1 rounded-full font-semibold mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>College Verified Student Carpools</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  Pool a Ride to VESIT Campus
                </h1>
                <p className="text-emerald-100 text-xs sm:text-sm mb-5">
                  Skip the crowded local train and auto queues. Travel comfortably with college peers and get 10% off with your student ID!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchSource('');
                      setSearchDest('');
                      fetchRides();
                      showToast('Showing all available student carpools', 'info');
                    }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-left transition cursor-pointer active:scale-95"
                  >
                    <div className="font-extrabold text-xs text-white">💰 Affordable Split Fare</div>
                    <div className="text-[10px] text-emerald-200">Driver-set shared fuel rates</div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      showToast('💡 10% Subsidy Arithmetic: Seats × Fare - 10% Off = Final Payable!', 'info');
                    }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-left transition cursor-pointer active:scale-95"
                  >
                    <div className="font-extrabold text-xs text-white">🎓 10% Student Subsidy</div>
                    <div className="text-[10px] text-emerald-200">Automatic arithmetic discount</div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      sourceInputRef.current?.focus();
                      showToast('Enter your pickup area below (e.g. Chembur, Dadar, Thane)', 'info');
                    }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-left transition cursor-pointer active:scale-95"
                  >
                    <div className="font-extrabold text-xs text-white">📍 Point A to Point B</div>
                    <div className="text-[10px] text-emerald-200">Direct rides to campus gate</div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-200 uppercase mb-1">Pick-up Location</label>
                    <input
                      ref={sourceInputRef}
                      type="text"
                      placeholder="e.g. Chembur, Dadar, Thane, Vashi..."
                      value={searchSource}
                      onChange={(e) => setSearchSource(e.target.value)}
                      className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-200 uppercase mb-1">Drop Location</label>
                    <input
                      type="text"
                      placeholder="VESIT Campus"
                      value={searchDest}
                      onChange={(e) => setSearchDest(e.target.value)}
                      className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        fetchRides();
                        showToast(`🔍 Searching for carpools from "${searchSource || 'anywhere'}"...`, 'info');
                      }}
                      className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition shadow cursor-pointer active:scale-95"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                    {(searchSource || searchDest) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchSource('');
                          setSearchDest('');
                          fetchRides();
                        }}
                        className="py-2 px-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        title="Clear filters"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span>Available Student Rides</span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                    {rides.length} active
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={fetchRides}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                >
                  ↻ Refresh list
                </button>
              </div>

              {rides.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No carpools currently available</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Be the first to offer a carpool ride for your college route!</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('offer')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    + Offer a Carpool Ride Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rides.map((ride) => (
                    <div 
                      key={ride.ride_id} 
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>

                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
                            <span>{ride.source}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{ride.destination}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ride.available_seats > 1 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {ride.available_seats} {ride.available_seats === 1 ? 'seat left' : 'seats left'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Driver:</span>
                            <span className="font-semibold text-slate-800 flex items-center space-x-1">
                              <span>{ride.driver_name}</span>
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded font-bold">VESIT</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Vehicle:</span>
                            <span className="text-slate-700 font-medium">{ride.vehicle_model} ({ride.vehicle_number})</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Departure:</span>
                            <span className="font-semibold text-slate-700 flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{ride.departure_time}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between mb-4">
                          <div>
                            <span className="text-lg font-black text-slate-900">₹{ride.cost_per_seat}</span>
                            <span className="text-xs text-slate-500"> / seat</span>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Tag className="w-3 h-3" />
                              <span>₹{(Number(ride.cost_per_seat) * 0.9).toFixed(0)} with Student ID</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const isDriver = currentUser && ride.driver_name?.toLowerCase() === currentUser.username.toLowerCase();
                        if (isDriver) {
                          return (
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 py-2.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Your Carpool</span>
                              </div>
                              <button
                                type="button"
                                disabled={actionLoadingId === ride.ride_id}
                                onClick={() => handleDeleteRide(ride.ride_id)}
                                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer active:scale-95 shrink-0"
                                title="Delete this ride"
                              >
                                {actionLoadingId === ride.ride_id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>Delete</span>
                              </button>
                            </div>
                          );
                        }

                        const currentName = (currentUser?.username || '').toLowerCase();
                        const userBooking = currentUser
                          ? bookings.find(b => b.ride_id === ride.ride_id && (b.passenger_name || '').toLowerCase() === currentName && (b.booking_status === 'PENDING' || b.booking_status === 'ACCEPTED'))
                          : null;

                        if (userBooking?.booking_status === 'PENDING') {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setMyRidesSubTab('passenger');
                                setActiveTab('bookings');
                              }}
                              className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs"
                              title="Click to view in My Rides"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                              <span>Approval Pending (View in My Rides)</span>
                            </button>
                          );
                        }

                        if (userBooking?.booking_status === 'ACCEPTED') {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setMyRidesSubTab('passenger');
                                setActiveTab('bookings');
                              }}
                              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs"
                              title="Click to view in My Rides"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Seat Confirmed (View in My Rides)</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => handleOpenBookingModal(ride)}
                            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer active:scale-95"
                          >
                            <span>Apply for Seat</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Offer Ride Tab */}
        {activeTab === 'offer' && (
          <div className="max-w-2xl mx-auto">
            {!currentUser ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Login Required to Offer a Carpool</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  Please log in with your college student account to publish an offered ride so classmates can book seats with you.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer active:scale-95"
                >
                  Login as Student Driver
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Offer Carpool Seats</h2>
                    <p className="text-xs text-slate-500">
                      Share your empty seats, help batchmates, and save fuel!
                    </p>
                  </div>
                </div>

                <form onSubmit={handleOfferRide} className="space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">Driver (Account)</label>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Locked to your username</span>
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={currentUser.username}
                        className="w-full bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 font-bold cursor-not-allowed select-none"
                      />
                      <div className="absolute right-3 top-2.5 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Car Model *</label>
                    <input
                      type="text"
                      placeholder="e.g. Hyundai i20 / Swift"
                      required
                      value={newRideForm.vehicle_model}
                      onChange={(e) => setNewRideForm({ ...newRideForm, vehicle_model: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Number Plate *</label>
                    <input
                      type="text"
                      placeholder="e.g. MH-01-AB-1234"
                      maxLength={14}
                      required
                      value={newRideForm.vehicle_number}
                      onChange={handleVehicleNumberChange}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wider font-semibold placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pickup (Point A) *</label>
                    <input
                      type="text"
                      placeholder="e.g. Chembur Naka / Dadar Circle"
                      required
                      value={newRideForm.source}
                      onChange={(e) => setNewRideForm({ ...newRideForm, source: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Drop Location (Point B) *</label>
                    <input
                      type="text"
                      required
                      value={newRideForm.destination}
                      onChange={(e) => setNewRideForm({ ...newRideForm, destination: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Departure Time (24-hr) *</label>
                    <input
                      type="text"
                      placeholder="e.g. 08:30 or 14:15"
                      maxLength={5}
                      required
                      value={newRideForm.departure_time}
                      onChange={handleDepartureTimeChange}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-semibold tracking-wider placeholder:font-sans placeholder:font-normal placeholder:tracking-normal"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Seats Available (Min: 1) *</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      required
                      placeholder="1 - 6"
                      value={newRideForm.available_seats}
                      onChange={handleSeatsChange}
                      onFocus={handleSeatsFocus}
                      onBlur={handleSeatsBlur}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rent / Seat (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="0"
                      value={newRideForm.cost_per_seat}
                      onChange={handleRentChange}
                      onFocus={handleRentFocus}
                      onBlur={handleRentBlur}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRide}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                >
                  {isSubmittingRide ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing Ride to Database...</span>
                    </>
                  ) : (
                    <>
                      <Car className="w-4 h-4" />
                      <span>Publish Ride to Database for ₹{newRideForm.cost_per_seat === '' ? 0 : newRideForm.cost_per_seat} / Seat</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
          </div>
        )}

        {/* My Rides & Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-5">

            {(() => {
              const currentName = (currentUser?.username || '').toLowerCase();
              const myBookingsCount = currentUser
                ? bookings.filter(b => (b.passenger_name || '').toLowerCase() === currentName).length
                : 0;
              const myPendingDriverRequestsCount = currentUser
                ? bookings.filter(b => (b.driver_name || '').toLowerCase() === currentName && b.booking_status === 'PENDING').length
                : 0;

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMyRidesSubTab('passenger')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                        myRidesSubTab === 'passenger'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🎒 Trips I Booked</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">
                        {myBookingsCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyRidesSubTab('driver')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                        myRidesSubTab === 'driver'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🚗 Requests for My Car</span>
                      {myPendingDriverRequestsCount > 0 && (
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                          {myPendingDriverRequestsCount} new
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleClearAllBookings}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
                      title="Clear all test bookings from database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Bookings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fetchBookings();
                        showToast('Updated rides list from database', 'info');
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition"
                    >
                      ↻ Refresh Status
                    </button>
                  </div>
                </div>
              );
            })()}

            {myRidesSubTab === 'passenger' && (() => {
              const currentName = (currentUser?.username || '').toLowerCase();
              if (!currentUser) {
                return (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Please login to view your booked rides</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Log in to view pending and confirmed carpool seats.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setShowAuthModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Login Now
                    </button>
                  </div>
                );
              }

              const userTrips = bookings.filter(b => (b.passenger_name || '').toLowerCase() === currentName);

              const pendingTrips = userTrips.filter(b => b.booking_status === 'PENDING');
              const confirmedTrips = userTrips.filter(b => b.booking_status === 'ACCEPTED');
              const declinedTrips = userTrips.filter(b => b.booking_status === 'REJECTED');

              return (
                <div className="space-y-6">
                  {userTrips.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                      <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">You haven't booked any rides yet</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">Find a carpool to campus and book an affordable seat!</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('find')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      >
                        Browse Available Carpools
                      </button>
                    </div>
                  ) : (
                    <>

                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          <h4 className="text-sm font-bold text-slate-900">
                            Approval Pending ({pendingTrips.length})
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            — Waiting for driver confirmation
                          </span>
                        </div>

                        {pendingTrips.length === 0 ? (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs text-center">
                            No pending ride requests.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingTrips.map((b) => (
                              <div key={b.booking_id} className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs">
                                <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
                                  <div>
                                    <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
                                      <span>{b.source}</span>
                                      <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                      <span>{b.destination}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>Departure: {b.departure_time}</span>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    ⏳ Pending Approval
                                  </span>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5 mb-3">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Driver:</span>
                                    <span className="font-semibold text-slate-800">{b.driver_name || 'Student Driver'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Seats Applied:</span>
                                    <span className="font-bold text-slate-900">{b.seats_requested} seat(s)</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-slate-400">Estimated Fare:</span>
                                    <div className="text-right">
                                      {b.total_fare && Number(b.total_fare) > Number(b.discounted_fare) && (
                                        <span className="line-through text-slate-400 text-[11px] mr-1.5">₹{b.total_fare}</span>
                                      )}
                                      <span className="font-black text-slate-900 text-sm">₹{b.discounted_fare}</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[11px] text-amber-700 font-medium">
                                  ⏳ Your request is with the driver. Once approved, your seat will be reserved!
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-sm font-bold text-slate-900">
                            Booked & Confirmed ({confirmedTrips.length})
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            — Seat reserved! Pay upon boarding
                          </span>
                        </div>

                        {confirmedTrips.length === 0 ? (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs text-center">
                            No confirmed trips yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {confirmedTrips.map((b) => (
                              <div key={b.booking_id} className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs">
                                <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
                                  <div>
                                    <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
                                      <span>{b.source}</span>
                                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>{b.destination}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>Departure: {b.departure_time}</span>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✅ Confirmed
                                  </span>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5 mb-3">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Driver:</span>
                                    <span className="font-semibold text-slate-800">{b.driver_name || 'Student Driver'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Seats Confirmed:</span>
                                    <span className="font-bold text-slate-900">{b.seats_requested} seat(s)</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-slate-400">Total Payable:</span>
                                    <div className="text-right">
                                      {b.total_fare && Number(b.total_fare) > Number(b.discounted_fare) && (
                                        <span className="line-through text-slate-400 text-[11px] mr-1.5">₹{b.total_fare}</span>
                                      )}
                                      <span className="font-black text-emerald-700 text-sm">₹{b.discounted_fare}</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-lg">
                                  🎉 Your seat is reserved! Pay ₹{b.discounted_fare} directly to {b.driver_name || 'driver'} via UPI or cash upon boarding.
                                </p>
                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-[11px] text-slate-500 font-medium">Arrived at campus?</span>
                                  {(() => {
                                    const existingRating = userRatings[b.booking_id];
                                    const isRated = Boolean(existingRating);

                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRatingModalBooking(b);
                                          setRatingValue(existingRating?.rating_value || 5);
                                          setRatingReview(existingRating?.review || 'Great safe driving, reached campus on time!');
                                        }}
                                        className={`px-3 py-1.5 font-bold text-xs rounded-xl transition shadow-xs flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
                                          isRated
                                            ? 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700'
                                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                        }`}
                                        title={isRated ? 'View / update your rating' : 'Rate this driver'}
                                      >
                                        <Star className={`w-3.5 h-3.5 fill-current ${isRated ? 'text-amber-400' : 'text-slate-950'}`} />
                                        <span>{isRated ? `Rated (${existingRating.rating_value}★)` : 'Rate Driver (★)'}</span>
                                      </button>
                                    );
                                  })()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {declinedTrips.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-700 mb-2">
                            Declined Requests ({declinedTrips.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {declinedTrips.map((b) => (
                              <div key={b.booking_id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs opacity-75">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-slate-800">{b.source} ➔ {b.destination}</span>
                                  <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded">Declined</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Carpool was full or cancelled by driver.</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {myRidesSubTab === 'driver' && (() => {
              const currentName = (currentUser?.username || '').toLowerCase();
              const myOfferedRides = currentUser
                ? rides.filter(r => (r.driver_name || '').toLowerCase() === currentName)
                : [];
              const myCarRequests = currentUser
                ? bookings.filter(b => (b.driver_name || '').toLowerCase() === currentName)
                : [];

              return (
                <div className="space-y-6">
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-emerald-950 mb-0.5">
                        Driver Inbox & Carpool Management
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        {currentUser 
                          ? `Manage carpools offered by ${currentUser.username} and review classmate seat requests.`
                          : 'Please login to manage your carpools and seat requests.'}
                      </p>
                    </div>
                    {myCarRequests.filter(b => b.booking_status === 'PENDING').length > 0 && (
                      <span className="text-xs font-extrabold bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full shrink-0">
                        {myCarRequests.filter(b => b.booking_status === 'PENDING').length} Pending Seat Request(s)
                      </span>
                    )}
                  </div>

                  {!currentUser ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                      <Lock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Login to manage your carpools & requests</p>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setShowAuthModal(true);
                        }}
                        className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                      >
                        Login as Driver
                      </button>
                    </div>
                  ) : (
                    <>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Car className="w-5 h-5 text-emerald-600" />
                            <h4 className="font-bold text-slate-900 text-sm">
                              Active Rides Offered by You ({myOfferedRides.length})
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('offer')}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Offer Another Ride</span>
                          </button>
                        </div>

                        {myOfferedRides.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Car className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-700">You haven't offered any carpool rides yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                              Offer a ride to share travel costs with college mates! You can offer multiple rides.
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('offer')}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                            >
                              + Offer a Carpool Ride Now
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {myOfferedRides.map(r => (
                              <div key={r.ride_id} className="p-4 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 flex flex-col justify-between transition">
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="font-bold text-slate-900 text-xs">
                                      {r.source} <span className="text-emerald-600 font-extrabold">➔</span> {r.destination}
                                    </div>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                                      ₹{r.cost_per_seat}/seat
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 space-y-1 mb-3">
                                    <div className="flex items-center space-x-1.5">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>Departure: <strong className="text-slate-700">{r.departure_time}</strong></span>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <Users className="w-3 h-3 text-slate-400" />
                                      <span>Available: <strong className="text-slate-700">{r.available_seats} seat(s)</strong></span>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <Car className="w-3 h-3 text-slate-400" />
                                      <span>{r.vehicle_model} ({r.vehicle_number})</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === r.ride_id}
                                    onClick={() => handleCompleteRide(r.ride_id)}
                                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 shadow-xs"
                                    title="Complete Ride and Audit to Ride_Logs"
                                  >
                                    {actionLoadingId === r.ride_id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Flag className="w-3.5 h-3.5" />
                                    )}
                                    <span>Complete Trip</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === r.ride_id}
                                    onClick={() => handleDeleteRide(r.ride_id)}
                                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer active:scale-95"
                                    title="Delete this Offered Ride"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Users className="w-5 h-5 text-emerald-600" />
                            <h4 className="font-bold text-slate-900 text-sm">
                              Passenger Requests for Your Car ({myCarRequests.length})
                            </h4>
                          </div>
                        </div>

                        {myCarRequests.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-700">No incoming passenger requests for your car yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              When classmates apply to book seats in your carpools, their requests will appear right here for your approval.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myCarRequests.map((b) => (
                              <div 
                                key={b.booking_id}
                                className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-start justify-between mb-3 border-b border-slate-200 pb-3">
                                    <div>
                                      <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                                        <User className="w-4 h-4 text-emerald-600" />
                                        <span>{b.passenger_name}</span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>{b.passenger_phone}</span>
                                      </div>
                                    </div>

                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      b.booking_status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                                      b.booking_status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                      'bg-rose-100 text-rose-800'
                                    }`}>
                                      {b.booking_status === 'ACCEPTED' ? 'Confirmed' :
                                       b.booking_status === 'PENDING' ? 'Pending Your Approval' : 'Declined'}
                                    </span>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 mb-4">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Route Requested:</span>
                                      <span className="font-semibold text-slate-800">{b.source} ➔ {b.destination}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Seats Requested:</span>
                                      <span className="font-bold text-slate-900">{b.seats_requested} seat(s)</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-slate-400">Fare to Collect:</span>
                                      <div className="text-right">
                                        {b.total_fare && Number(b.total_fare) > Number(b.discounted_fare) && (
                                          <span className="line-through text-slate-400 text-[11px] mr-1.5">₹{b.total_fare}</span>
                                        )}
                                        <span className="font-black text-emerald-700 text-sm">₹{b.discounted_fare}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  {b.booking_status === 'PENDING' ? (
                                    <div className="flex space-x-2">
                                      <button
                                        type="button"
                                        disabled={actionLoadingId === b.booking_id}
                                        onClick={() => handleAcceptRequest(b.booking_id)}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center space-x-1"
                                      >
                                        {actionLoadingId === b.booking_id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                        <span>Accept Request</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={actionLoadingId === b.booking_id}
                                        onClick={() => handleRejectRequest(b.booking_id)}
                                        className="py-2 px-3 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer active:scale-95"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-center py-2 text-xs text-slate-600 font-semibold bg-emerald-50 rounded-xl p-2 border border-emerald-100 flex items-center justify-center space-x-1.5">
                                      <span>{b.booking_status === 'ACCEPTED' ? '✅ You confirmed this booking' : '❌ You declined this request'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
          </>
        )}
      </main>

      {/* Booking Modal */}
      {selectedRide && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Book Carpool Seat
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedRide.source} ➔ {selectedRide.destination}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedRide(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Driver:</span>
                <span className="font-semibold text-slate-800">{selectedRide.driver_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Car & Plate:</span>
                <span className="text-slate-700">{selectedRide.vehicle_model} ({selectedRide.vehicle_number})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Departure:</span>
                <span className="font-semibold text-slate-700">{selectedRide.departure_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Seats Left:</span>
                <span className="font-bold text-emerald-600">{selectedRide.available_seats} remaining</span>
              </div>
            </div>

            <div className="space-y-3 mb-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Passenger (Account)</label>
                  <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Locked to your username</span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={currentUser ? currentUser.username : (passengerNameInput || 'Student Passenger')}
                    className="w-full bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg text-slate-800 font-bold cursor-not-allowed select-none"
                  />
                  <div className="absolute right-3 top-2.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block font-semibold text-slate-700 text-xs">Seats to Reserve</label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {selectedRide.available_seats} seat{selectedRide.available_seats === 1 ? '' : 's'} available
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(6, Math.max(1, selectedRide.available_seats)) }, (_, i) => i + 1).map((num) => {
                    const isDisabled = num > selectedRide.available_seats;
                    const isSelected = requestedSeats === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setRequestedSeats(num)}
                        className={`flex-1 py-2 rounded-xl font-extrabold text-xs border transition cursor-pointer ${
                          isSelected 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500/50' 
                            : isDisabled
                            ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {num} {num === 1 ? 'Seat' : 'Seats'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div 
                onClick={() => setApplyStudentDiscount(!applyStudentDiscount)}
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer select-none transition hover:bg-emerald-50"
              >
                <div className="flex items-center space-x-2">
                  {applyStudentDiscount ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <span className="font-bold text-emerald-950 text-xs">Apply VESIT Student Subsidy</span>
                    <p className="text-[10px] text-emerald-700">10% discount with College ID</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  -10% OFF
                </span>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs space-y-1.5 mb-4 shadow-xs">
              <div className="flex justify-between text-slate-300">
                <span>Seats Selected:</span>
                <span className="font-bold text-white">{requestedSeats} seat{requestedSeats > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Base Rent ({requestedSeats} × ₹{unitPrice}):</span>
                <span className="font-bold text-white">₹{baseFare.toFixed(2)}</span>
              </div>
              {applyStudentDiscount && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Student Discount (10%):</span>
                  <span>- ₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-1.5 flex justify-between items-baseline font-bold text-sm">
                <span>Total Payable:</span>
                <span className="text-emerald-400 font-black text-base">₹{finalFare.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedRide(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBookingSeat}
                onClick={handleConfirmBooking}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5"
              >
                {isBookingSeat ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Booking Seat...</span>
                  </>
                ) : (
                  <span>Confirm Booking</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {authMode === 'login' ? 'Login to CampusPool' : 'Create Student Account'}
                </h3>
                <p className="text-xs text-slate-500">Only username and password required</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                  authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                  authMode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer active:scale-95"
              >
                {authLoading ? 'Connecting...' : authMode === 'login' ? 'Login' : 'Create Account'}
              </button>

              {authMode === 'login' && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Admin Live DB:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthUsername('admin');
                      setAuthPassword('123');
                    }}
                    className="text-purple-600 hover:text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    Fill admin / 123
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModalBooking && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Post-Trip Feedback
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Rate Driver: {ratingModalBooking.driver_name || 'Student Driver'}
                </h3>
                <p className="text-xs text-slate-500">{ratingModalBooking.source} ➔ {ratingModalBooking.destination}</p>
              </div>
              <button 
                type="button"
                onClick={() => setRatingModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Rating (1 to 5 Stars)</label>
                <div className="flex items-center justify-center space-x-2 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingValue(star)}
                      className="p-1 cursor-pointer hover:scale-110 transition active:scale-95"
                    >
                      <Star 
                        className={`w-7 h-7 ${star <= ratingValue ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} 
                      />
                    </button>
                  ))}
                </div>
                <div className="text-center text-xs font-extrabold text-slate-700 mt-1">
                  {ratingValue === 5 ? '⭐⭐⭐⭐⭐ Excellent (5/5)' :
                   ratingValue === 4 ? '⭐⭐⭐⭐ Good (4/5)' :
                   ratingValue === 3 ? '⭐⭐⭐ Average (3/5)' :
                   ratingValue === 2 ? '⭐⭐ Poor (2/5)' : '⭐ Very Poor (1/5)'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Feedback / Review</label>
                <textarea
                  rows={3}
                  required
                  value={ratingReview}
                  onChange={(e) => setRatingReview(e.target.value)}
                  placeholder="e.g. Great safe driving, arrived on time at VESIT campus!"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingRating}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-md cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5"
              >
                {isSubmittingRating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Submit Rating to TiDB Database</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>CampusPool — VESIT College Carpool Matching System</span>
          <span>Point A to Point B • Affordable Shared Fares • 10% Student Subsidy</span>
        </div>
      </footer>
    </div>
  );
}
