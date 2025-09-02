import React, { useState } from 'react';
import { Activity, Settings } from 'lucide-react';
import { useOptimisticSlotLocking } from '../../hooks/useOptimisticSlotLocking';
import { useSlotLockingMetrics } from '../../hooks/useSlotLockingMetrics';
import { useBookingUIStore } from '../../store/uiStore';
import Button from '../ui/Button';
import SlotLockingDashboard from './SlotLockingDashboard';
import { AvailableSlot } from '../../types';

const SlotLockingDemo: React.FC = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [demoSlots] = useState<AvailableSlot[]>([
    {
      dateTime: '2024-01-15T10:00:00Z',
      startTime: '10:00',
      endTime: '11:00',
      time: '10:00',
      available: true,
      locked: false,
      employeeId: 'emp-1',
      employeeName: 'Demo Employee',
      serviceId: 'svc-1',
      serviceName: 'Demo Service',
      durationMinutes: 60,
      price: 50,
    },
    {
      dateTime: '2024-01-15T11:00:00Z',
      startTime: '11:00',
      endTime: '12:00',
      time: '11:00',
      available: true,
      locked: false,
      employeeId: 'emp-1',
      employeeName: 'Demo Employee',
      serviceId: 'svc-1',
      serviceName: 'Demo Service',
      durationMinutes: 60,
      price: 50,
    },
    {
      dateTime: '2024-01-15T12:00:00Z',
      startTime: '12:00',
      endTime: '13:00',
      time: '12:00',
      available: true,
      locked: true,
      lockedBy: 'other-user',
      employeeId: 'emp-1',
      employeeName: 'Demo Employee',
      serviceId: 'svc-1',
      serviceName: 'Demo Service',
      durationMinutes: 60,
      price: 50,
    },
  ]);

  const { lockSlotOptimistic, getSlotState } = useOptimisticSlotLocking();
  const { getMetrics, getSuccessRate } = useSlotLockingMetrics();
  const { slotStates } = useBookingUIStore();

  const generateSlotKey = (slot: AvailableSlot) => {
    return `demo-shop-${slot.serviceId}-${slot.employeeId}-${slot.dateTime}`;
  };

  const handleDemoLock = async (slot: AvailableSlot) => {
    try {
      await lockSlotOptimistic({
        shopId: 'demo-shop',
        serviceId: slot.serviceId,
        employeeId: slot.employeeId,
        dateTime: slot.dateTime,
        slot,
      });
    } catch (error) {
      console.log('Demo lock failed (expected for demo):', error);
    }
  };

  const simulateNetworkError = async (slot: AvailableSlot) => {
    const slotKey = generateSlotKey(slot);
    const { setSlotState } = useBookingUIStore.getState();
    
    // Simulate locking state
    setSlotState(slotKey, { state: 'locking', lastAttempt: Date.now() });
    
    // Simulate network delay
    setTimeout(() => {
      setSlotState(slotKey, { 
        state: 'error', 
        error: 'Network timeout (simulated)',
        lastAttempt: Date.now() 
      });
    }, 2000);
  };

  const simulateSuccess = async (slot: AvailableSlot) => {
    const slotKey = generateSlotKey(slot);
    const { setSlotState } = useBookingUIStore.getState();
    
    // Simulate locking state
    setSlotState(slotKey, { state: 'locking', lastAttempt: Date.now() });
    
    // Simulate success after delay
    setTimeout(() => {
      setSlotState(slotKey, { 
        state: 'locked', 
        lockToken: 'demo-token-' + Date.now(),
        lastAttempt: Date.now() 
      });
    }, 1000);
  };

  const metrics = getMetrics();
  const successRate = getSuccessRate();

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Slot Locking Optimizations Demo
          </h2>
        </div>
        <Button
          onClick={() => setShowDashboard(true)}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>View Dashboard</span>
        </Button>
      </div>

      {/* Demo Description */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Features Demonstrated:</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• <strong>Optimistic Updates:</strong> Immediate visual feedback</li>
          <li>• <strong>Error Handling:</strong> Graceful failure recovery</li>
          <li>• <strong>Retry Logic:</strong> Automatic retry with exponential backoff</li>
          <li>• <strong>State Management:</strong> Granular slot state tracking</li>
          <li>• <strong>Performance Metrics:</strong> Real-time analytics</li>
        </ul>
      </div>

      {/* Demo Slots */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Time Slots</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demoSlots.map((slot) => {
            const slotKey = generateSlotKey(slot);
            const slotState = getSlotState(slotKey);
            
            return (
              <div key={slotKey} className="border rounded-lg p-4">
                <div className="text-center mb-3">
                  <div className="text-lg font-semibold">{slot.time}</div>
                  <div className="text-sm text-gray-600">{slot.serviceName}</div>
                </div>
                
                {/* State indicator */}
                <div className={`text-center text-xs font-medium mb-3 px-2 py-1 rounded ${
                  slotState.state === 'locked' ? 'bg-green-100 text-green-800' :
                  slotState.state === 'locking' ? 'bg-blue-100 text-blue-800' :
                  slotState.state === 'error' ? 'bg-red-100 text-red-800' :
                  slot.locked ? 'bg-gray-100 text-gray-800' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  {slotState.state === 'locking' ? 'Locking...' :
                   slotState.state === 'locked' ? 'Locked' :
                   slotState.state === 'error' ? 'Error' :
                   slot.locked ? 'Unavailable' : 'Available'}
                </div>

                {/* Demo actions */}
                <div className="space-y-2">
                  <Button
                    size="sm"
                    onClick={() => simulateSuccess(slot)}
                    disabled={slot.locked || slotState.state === 'locking'}
                    className="w-full"
                  >
                    Simulate Success
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateNetworkError(slot)}
                    disabled={slot.locked || slotState.state === 'locking'}
                    className="w-full"
                  >
                    Simulate Error
                  </Button>
                </div>

                {/* Error display */}
                {slotState.error && (
                  <div className="mt-2 text-xs text-red-600 text-center">
                    {slotState.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-gray-900">{metrics.attempts}</div>
          <div className="text-sm text-gray-600">Total Attempts</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-900">{metrics.successes}</div>
          <div className="text-sm text-green-600">Successes</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-900">{metrics.failures}</div>
          <div className="text-sm text-red-600">Failures</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-900">{successRate.toFixed(1)}%</div>
          <div className="text-sm text-blue-600">Success Rate</div>
        </div>
      </div>

      {/* Active States */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Active Slot States</h4>
        {slotStates.size === 0 ? (
          <p className="text-gray-500 text-sm">No active slot states</p>
        ) : (
          <div className="space-y-1">
            {Array.from(slotStates.entries()).map(([key, state]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="font-mono text-xs">{key.split('-').slice(-1)[0]}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  state.state === 'locked' ? 'bg-green-100 text-green-800' :
                  state.state === 'locking' ? 'bg-blue-100 text-blue-800' :
                  state.state === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {state.state}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard Modal */}
      <SlotLockingDashboard
        isVisible={showDashboard}
        onClose={() => setShowDashboard(false)}
      />
    </div>
  );
};

export default SlotLockingDemo;
