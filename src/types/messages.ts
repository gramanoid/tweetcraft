/**
 * Type-safe message definitions for Chrome extension message passing
 */

import { AppConfig, ReplyGenerationRequest, TwitterContext } from './index';

// Message types enum for type safety
export enum MessageType {
  GET_CONFIG = 'GET_CONFIG',
  SET_CONFIG = 'SET_CONFIG',
  GET_API_KEY = 'GET_API_KEY',
  SET_API_KEY = 'SET_API_KEY',
  VALIDATE_API_KEY = 'VALIDATE_API_KEY',
  CLEAR_DATA = 'CLEAR_DATA',
  GET_LAST_TONE = 'GET_LAST_TONE',
  SET_LAST_TONE = 'SET_LAST_TONE',
  GENERATE_REPLY = 'GENERATE_REPLY',
  GET_STORAGE = 'GET_STORAGE',
  SET_STORAGE = 'SET_STORAGE',
  TEST_API_KEY = 'TEST_API_KEY',
  FETCH_MODELS = 'FETCH_MODELS'
}

// Base message interface
interface BaseMessage {
  type: MessageType;
}

// Specific message types
export interface GetConfigMessage extends BaseMessage {
  type: MessageType.GET_CONFIG;
}

export interface SetConfigMessage extends BaseMessage {
  type: MessageType.SET_CONFIG;
  config: Partial<AppConfig>;
}

export interface GetApiKeyMessage extends BaseMessage {
  type: MessageType.GET_API_KEY;
}

export interface SetApiKeyMessage extends BaseMessage {
  type: MessageType.SET_API_KEY;
  apiKey: string;
}

export interface ValidateApiKeyMessage extends BaseMessage {
  type: MessageType.VALIDATE_API_KEY;
  apiKey?: string;
}

export interface ClearDataMessage extends BaseMessage {
  type: MessageType.CLEAR_DATA;
}

export interface GetLastToneMessage extends BaseMessage {
  type: MessageType.GET_LAST_TONE;
}

export interface SetLastToneMessage extends BaseMessage {
  type: MessageType.SET_LAST_TONE;
  tone: string;
}

export interface GenerateReplyMessage extends BaseMessage {
  type: MessageType.GENERATE_REPLY;
  request: ReplyGenerationRequest;
  context: TwitterContext;
}

export interface GetStorageMessage extends BaseMessage {
  type: MessageType.GET_STORAGE;
  keys: string | string[] | { [key: string]: any } | null;
}

export interface SetStorageMessage extends BaseMessage {
  type: MessageType.SET_STORAGE;
  data: { [key: string]: any };
}

export interface TestApiKeyMessage extends BaseMessage {
  type: MessageType.TEST_API_KEY;
  apiKey: string;
}

export interface FetchModelsMessage extends BaseMessage {
  type: MessageType.FETCH_MODELS;
}

// Union type of all messages
export type ExtensionMessage = 
  | GetConfigMessage
  | SetConfigMessage
  | GetApiKeyMessage
  | SetApiKeyMessage
  | ValidateApiKeyMessage
  | ClearDataMessage
  | GetLastToneMessage
  | SetLastToneMessage
  | GenerateReplyMessage
  | GetStorageMessage
  | SetStorageMessage
  | TestApiKeyMessage
  | FetchModelsMessage;

// Type guard functions
export function isGetConfigMessage(msg: any): msg is GetConfigMessage {
  return msg?.type === MessageType.GET_CONFIG;
}

export function isSetConfigMessage(msg: any): msg is SetConfigMessage {
  return msg?.type === MessageType.SET_CONFIG && msg?.config !== undefined;
}

export function isGetApiKeyMessage(msg: any): msg is GetApiKeyMessage {
  return msg?.type === MessageType.GET_API_KEY;
}

export function isSetApiKeyMessage(msg: any): msg is SetApiKeyMessage {
  return msg?.type === MessageType.SET_API_KEY && typeof msg?.apiKey === 'string';
}

export function isValidateApiKeyMessage(msg: any): msg is ValidateApiKeyMessage {
  return msg?.type === MessageType.VALIDATE_API_KEY;
}

export function isClearDataMessage(msg: any): msg is ClearDataMessage {
  return msg?.type === MessageType.CLEAR_DATA;
}

export function isGetLastToneMessage(msg: any): msg is GetLastToneMessage {
  return msg?.type === MessageType.GET_LAST_TONE;
}

export function isSetLastToneMessage(msg: any): msg is SetLastToneMessage {
  return msg?.type === MessageType.SET_LAST_TONE && typeof msg?.tone === 'string';
}

export function isGenerateReplyMessage(msg: any): msg is GenerateReplyMessage {
  return msg?.type === MessageType.GENERATE_REPLY && 
         msg?.request !== undefined && 
         msg?.context !== undefined;
}

export function isGetStorageMessage(msg: any): msg is GetStorageMessage {
  return msg?.type === MessageType.GET_STORAGE;
}

export function isSetStorageMessage(msg: any): msg is SetStorageMessage {
  return msg?.type === MessageType.SET_STORAGE && msg?.data !== undefined;
}

export function isTestApiKeyMessage(msg: any): msg is TestApiKeyMessage {
  return msg?.type === MessageType.TEST_API_KEY && typeof msg?.apiKey === 'string';
}

export function isFetchModelsMessage(msg: any): msg is FetchModelsMessage {
  return msg?.type === MessageType.FETCH_MODELS;
}

// Response types
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}