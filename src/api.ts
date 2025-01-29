import path from 'path'
import fetch from 'node-fetch'

interface AuthResponse {
        access_token: string,
        token_type: string
        expires_in: number
        scope: string
}
const createEndpoint = (host: string, path: string) => new URL(path, host).toString();

export async function getAccessToken(host: string, clientId: string, secret: string, apikey: string) {
    if (!clientId || !host || !secret || !apikey) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/identity/v2/oauth2/token`);
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            "Authorization": "Basic " + Buffer.from(clientId + ':' + secret).toString('base64'),
            "x-api-key": apikey,
            "content-type": "application/x-www-form-urlencoded"
        },
        body: 'grant_type=client_credentials'
    });
    // console.log(response.status);
    if (response.status !== 200) {
        throw new Error(response.statusText);
    }
    const result = await response.json() as AuthResponse;
    return result.access_token;
};

async function fetchGet(endpoint: string, token: string) {
    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            "Authorization": "Bearer " + token,
            "content-type": "application/json"
        },
    });
    if (response.status !== 200) {
        if (response.status === 404) {
            throw new Error('Card not found');
        }
        throw new Error(response.statusText);
    }
    const result = await response.json();
    return result;
}

async function fetchPost(endpoint: string, token: string, body: object) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            "Authorization": "Bearer " + token,
            "content-type": "application/json"
        },
        body: JSON.stringify(body),
    });
    if (response.status !== 200) {
        if (response.status === 404) {
            throw new Error('Card not found');
        }
        throw new Error(response.statusText);
    }
    const result = await response.json();
    return result;
}

export async function uploadEnv(cardkey: number, env: object, host: string, token: string) {
    if (!cardkey || !env || !host || !token) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/za/v1/cards/${encodeURIComponent(cardkey.toString())}/environmentvariables`);
    return fetchPost(endpoint, token, env);
}

export async function uploadCode(cardkey: number, code: object, host: string, token: string): Promise<CodeResponse> {
    if (!cardkey || !code || !host || !token) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/za/v1/cards/${encodeURIComponent(cardkey.toString())}/code`);
    return fetchPost(endpoint, token, code) as Promise<CodeResponse>;
}

export async function uploadPublishedCode(cardkey: number, codeid: string, code: string, host: string, token: string): Promise<CodeResponse> {
    if (!cardkey || !codeid || !code || !host || !token) {
        throw new Error('Missing required parameters');
    }
    const raw = {"code": code, "codeId": codeid};
    const endpoint = createEndpoint(host, `/za/v1/cards/${encodeURIComponent(cardkey.toString())}/publish`);
    return fetchPost(endpoint, token, raw) as Promise<CodeResponse>;
}
interface Card {
    "CardKey": number
    "CardNumber": string
    "IsProgrammable": boolean
    "status": string
    "CardTypeCode": string
    "AccountNumber": string
    "AccountId": string
}
interface CardResponse{
    "data": {
        "cards": Card[]
    }
}
export async function fetchCards(host: string, token: string) {
    if (!host || !token) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/za/v1/cards`);
    const result = await fetchGet(endpoint, token) as CardResponse;
    return result.data.cards;
}
interface EnvVars {
    [key: string]: string
}
interface EnvResponse {
    "data": {
        "result": {
            "variables": EnvVars,
            "createdAt": string,
            "updatedAt": string,
            "error": null
        }
    }
}

export async function fetchEnv(cardkey: number, host: string, token: string) {
    if (!cardkey || !host || !token) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/za/v1/cards/${encodeURIComponent(cardkey.toString())}/environmentvariables`);
    const result = await fetchGet(endpoint, token) as EnvResponse;
    return result.data.result.variables;
}

interface CodeResponse {
    data: {
        result: {
            codeId: string;
            code: string;
            createdAt: string;
            updatedAt: string;
            error: null;
        };
    }
}

export async function fetchCode(cardkey: number, host: string, token: string) {
    if (!cardkey || !host || !token) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/za/v1/cards/${encodeURIComponent(cardkey.toString())}/code`);
    const result = await fetchGet(endpoint, token) as CodeResponse;
    return result.data.result;
}

export async function fetchPublishedCode(cardkey: number, host: string, token: string) {
    if (!cardkey || !host || !token) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/za/v1/cards/${encodeURIComponent(cardkey.toString())}/publishedcode`);
    const result = await fetchGet(endpoint, token) as CodeResponse;
    return result.data.result.code;
}
interface CodeToggle {
    data: { result: { Enabled: boolean } }
}
export async function toggleCode(cardkey: number, enabled: boolean, host: string, token: string) {
    if (!cardkey || !host || !token || enabled === undefined) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/za/v1/cards/${encodeURIComponent(cardkey.toString())}/toggle-programmable-feature`);
    const result = await fetchPost(endpoint, token, {Enabled: enabled}) as CodeToggle;
    return result.data.result.Enabled;
}

interface ExecutionResult {
    data: { result: { executionItems: [], error: null } }
}
export async function fetchExecutions(cardkey: number, host: string, token: string) {
    if (!cardkey || !host || !token) {
        throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(host, `/za/v1/cards/${encodeURIComponent(cardkey.toString())}/code/executions`);
    const result = await fetchGet(endpoint, token) as ExecutionResult;
    return result;
}