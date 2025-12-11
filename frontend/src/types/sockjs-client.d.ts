declare module 'sockjs-client' {
    export default class SockJS {
        constructor(url: string, _reserved?: any, options?: any);
        close(code?: number, reason?: string): void;
        send(data: string): void;
        onopen: ((event: any) => void) | null;
        onmessage: ((event: any) => void) | null;
        onclose: ((event: any) => void) | null;
        onerror: ((event: any) => void) | null;
        readyState: number;
    }
}

