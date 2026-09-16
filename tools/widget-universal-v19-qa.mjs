import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
const studio=fs.readFileSync(path.join(root,"public/assets/js/widget-studio.js"),"utf8");
const html=fs.readFileSync(path.join(root,"public/pages/widget-studio.html"),"utf8");
const runtime=fs.readFileSync(path.join(root,"public/widgets/studio.html"),"utf8");
const output=fs.readFileSync(path.join(root,"public/widgets/output.html"),"utf8");
const renderer=fs.readFileSync(path.join(root,"public/assets/js/cfs-widget-renderer.js"),"utf8");

const must=(cond,msg)=>{if(!cond)throw new Error(msg)};
must(server.includes("version: 6"),"Widget config version 6 missing");
for(const key of ["obs","tiktok_vertical","landscape"])must(server.includes(key),`Server output ${key} missing`);
must(server.includes("studioWidgetOutputUrls"),"Output URLs missing");
must(server.includes("studioCreatorIdentity"),"Creator identity missing");
must(server.includes('source_url: studioWidgetSourceUrl'),"Legacy OBS source URL compatibility missing");
must(runtime.includes("cfs-widget-renderer.js")&&runtime.includes("cfs-widget-runtime.js"),"OBS runtime not using shared renderer");
must(output.includes('data-default-profile="tiktok_vertical"'),"Universal output runtime missing");
must(html.includes("UNIVERSAL OUTPUT")&&html.includes('data-preview-profile="tiktok_vertical"'),"Output editor UI missing");
must(studio.includes("CFSWidgetRenderer.renderElements"),"Editor not using shared renderer");
must(renderer.includes("profileFollowers")&&renderer.includes("profileLikes"),"Creator profile bindings missing");

const typeMatches=[...server.matchAll(/^\s{4}([a-z_]+):\s*\{\s*$/gm)].map(m=>m[1]);
const known=["follower_goal","follower_counter","profile_likes_counter","live_like_goal","live_like_counter","viewer_counter","gift_goal","gift_counter","share_goal","share_counter","follower_gain_counter","follower_gain_goal","follow_alert","gift_alert","share_alert","goal_reached_alert","latest_follower","latest_gift","latest_share"];
for(const key of known)must(server.includes(`${key}: {`),`Existing widget type lost: ${key}`);

console.log(JSON.stringify({ok:true,widget_types:known.length,profiles:3,config_version:6}));
