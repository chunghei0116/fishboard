import Collection from './collection';
import { requireChatGPTUser } from './chatgpt-auth';
export const dynamic = 'force-dynamic';
async function PersonalCollection(){await requireChatGPTUser('/');return <Collection/>}
export default function Page(){return <PersonalCollection/>}
