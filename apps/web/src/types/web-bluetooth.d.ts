/**
 * Web Bluetooth API Type Definitions
 *
 * Types for navigator.bluetooth and related interfaces
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
 */

interface BluetoothRequestDeviceFilter {
  services?: BluetoothServiceUUID[];
  name?: string;
  namePrefix?: string;
  manufacturerData?: BluetoothManufacturerDataFilter[];
  serviceData?: BluetoothServiceDataFilter[];
}

interface BluetoothManufacturerDataFilter {
  companyIdentifier: number;
  dataPrefix?: BufferSource;
  mask?: BufferSource;
}

interface BluetoothServiceDataFilter {
  service: BluetoothServiceUUID;
  dataPrefix?: BufferSource;
  mask?: BufferSource;
}

interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  optionalServices?: BluetoothServiceUUID[];
  optionalManufacturerData?: number[];
  acceptAllDevices?: boolean;
}

type BluetoothServiceUUID = number | string;
type BluetoothCharacteristicUUID = number | string;
type BluetoothDescriptorUUID = number | string;

interface BluetoothRemoteGATTDescriptor {
  characteristic: BluetoothRemoteGATTCharacteristic;
  uuid: string;
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
}

interface BluetoothCharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  service: BluetoothRemoteGATTService;
  uuid: string;
  properties: BluetoothCharacteristicProperties;
  value?: DataView;
  getDescriptor(descriptor: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor>;
  getDescriptors(descriptor?: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor[]>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithResponse(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  oncharacteristicvaluechanged: ((this: BluetoothRemoteGATTCharacteristic, ev: Event) => void) | null;
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (this: BluetoothRemoteGATTCharacteristic, ev: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: 'characteristicvaluechanged',
    listener: (this: BluetoothRemoteGATTCharacteristic, ev: Event) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

interface BluetoothRemoteGATTService extends EventTarget {
  device: BluetoothDevice;
  uuid: string;
  isPrimary: boolean;
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>;
  getIncludedService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  getIncludedServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  watchAdvertisements(options?: WatchAdvertisementsOptions): Promise<void>;
  unwatchAdvertisements(): void;
  watchingAdvertisements: boolean;
  ongattserverdisconnected: ((this: BluetoothDevice, ev: Event) => void) | null;
  onadvertisementreceived: ((this: BluetoothDevice, ev: BluetoothAdvertisingEvent) => void) | null;
  addEventListener(
    type: 'gattserverdisconnected',
    listener: (this: BluetoothDevice, ev: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: 'advertisementreceived',
    listener: (this: BluetoothDevice, ev: BluetoothAdvertisingEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: 'gattserverdisconnected',
    listener: (this: BluetoothDevice, ev: Event) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: 'advertisementreceived',
    listener: (this: BluetoothDevice, ev: BluetoothAdvertisingEvent) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

interface WatchAdvertisementsOptions {
  signal?: AbortSignal;
}

interface BluetoothManufacturerDataMap {
  [key: number]: DataView;
}

interface BluetoothServiceDataMap {
  [key: string]: DataView;
}

interface BluetoothAdvertisingEvent extends Event {
  device: BluetoothDevice;
  uuids: string[];
  name?: string;
  appearance?: number;
  txPower?: number;
  rssi?: number;
  manufacturerData: BluetoothManufacturerDataMap;
  serviceData: BluetoothServiceDataMap;
}

interface Bluetooth extends EventTarget {
  getAvailability(): Promise<boolean>;
  onavailabilitychanged: ((this: Bluetooth, ev: Event) => void) | null;
  referringDevice?: BluetoothDevice;
  getDevices(): Promise<BluetoothDevice[]>;
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  addEventListener(
    type: 'availabilitychanged',
    listener: (this: Bluetooth, ev: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: 'availabilitychanged',
    listener: (this: Bluetooth, ev: Event) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

interface Navigator {
  bluetooth: Bluetooth;
}

// Extend the global Window interface
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

export type {
  Bluetooth,
  BluetoothDevice,
  BluetoothRemoteGATTServer,
  BluetoothRemoteGATTService,
  BluetoothRemoteGATTCharacteristic,
  BluetoothRemoteGATTDescriptor,
  BluetoothCharacteristicProperties,
  BluetoothAdvertisingEvent,
  RequestDeviceOptions,
  BluetoothRequestDeviceFilter,
  BluetoothServiceUUID,
  BluetoothCharacteristicUUID,
};
