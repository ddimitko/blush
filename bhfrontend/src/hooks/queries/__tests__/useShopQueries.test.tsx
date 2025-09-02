import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useShopQuery, useShopsQuery, useShopServicesQuery } from '../useShopQueries';
import { apiClient } from '../../../lib/api';

// Mock the API client
jest.mock('../../../lib/api', () => ({
  apiClient: {
    getShop: jest.fn(),
    getShops: jest.fn(),
    getPublicShopServices: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Helper to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useShopQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches shop data successfully', async () => {
    const mockShop = {
      id: '1',
      name: 'Test Shop',
      description: 'Test Description',
      address: 'Test Address',
    };

    mockApiClient.getShop.mockResolvedValueOnce(mockShop);

    const { result } = renderHook(() => useShopQuery('1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockShop);
    expect(mockApiClient.getShop).toHaveBeenCalledWith('1');
  });

  test('handles shop fetch error', async () => {
    const mockError = new Error('Shop not found');
    mockApiClient.getShop.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useShopQuery('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  test('does not fetch when shopId is undefined', () => {
    renderHook(() => useShopQuery(undefined), {
      wrapper: createWrapper(),
    });

    expect(mockApiClient.getShop).not.toHaveBeenCalled();
  });
});

describe('useShopsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches shops with search params', async () => {
    const mockShops = [
      { id: '1', name: 'Shop 1' },
      { id: '2', name: 'Shop 2' },
    ];

    mockApiClient.getShops.mockResolvedValueOnce({
      content: mockShops,
      totalElements: 2,
    });

    const searchParams = { search: 'test', city: 'Sofia' };

    const { result } = renderHook(() => useShopsQuery(searchParams), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      content: mockShops,
      totalElements: 2,
    });
    expect(mockApiClient.getShops).toHaveBeenCalledWith(searchParams);
  });

  test('handles empty search params', async () => {
    const mockShops = [];

    mockApiClient.getShops.mockResolvedValueOnce({
      content: mockShops,
      totalElements: 0,
    });

    const { result } = renderHook(() => useShopsQuery({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      content: mockShops,
      totalElements: 0,
    });
  });
});

describe('useShopServicesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches shop services successfully', async () => {
    const mockServices = [
      { id: '1', name: 'Haircut', price: 50 },
      { id: '2', name: 'Manicure', price: 30 },
    ];

    mockApiClient.getPublicShopServices.mockResolvedValueOnce(mockServices);

    const { result } = renderHook(() => useShopServicesQuery('shop-1', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockServices);
    expect(mockApiClient.getPublicShopServices).toHaveBeenCalledWith('shop-1');
  });

  test('does not fetch when shopId is undefined', () => {
    renderHook(() => useShopServicesQuery(undefined, true), {
      wrapper: createWrapper(),
    });

    expect(mockApiClient.getPublicShopServices).not.toHaveBeenCalled();
  });

  test('does not fetch when enabled is false', () => {
    renderHook(() => useShopServicesQuery('shop-1', false), {
      wrapper: createWrapper(),
    });

    expect(mockApiClient.getPublicShopServices).not.toHaveBeenCalled();
  });
});
