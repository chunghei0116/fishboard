import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export function bindings(){return env as unknown as {DB:D1Database;BUCKET:R2Bucket;OPENAI_API_KEY?:string;OPENAI_IMAGE_MODEL?:string}}
export async function identity(){const u=await getChatGPTUser();if(!u)throw new ApiError('請先登入，再開啟收藏室。',401);return u.userId;}
export class ApiError extends Error{constructor(message:string,public status=400){super(message)}}
export function failure(e:unknown){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status});console.error('Fish collection request failed',e instanceof Error?e.name:'unknown');return Response.json({error:'暫時未能讀取或儲存收藏，請稍後再試。'},{status:503});}
export function publicCatch(row:any){return {...row,owner:undefined,source:`/api/images/${row.id}?kind=source`,image:`/api/images/${row.id}`}}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new ApiError('請由收藏室內進行操作。',403)}
