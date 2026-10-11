import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ session:vi.fn(),member:vi.fn(),report:vi.fn(),rpc:vi.fn(),upload:vi.fn(),remove:vi.fn(),read:vi.fn(),limit:vi.fn(),configured:true,filters:[] as unknown[][] }));
vi.mock("@/lib/api",()=>({ requireSession:m.session,limitRequest:m.limit,apiError:(status:number,error:string)=>Response.json({ error },{ status }) }));
vi.mock("@/lib/ai/report-reader",()=>({ MAX_REPORT_BYTES:3*1024*1024,isReportImage:(b:Buffer,mime:string)=>mime==="image/png"&&b[0]===137,readHackersReport:m.read }));
vi.mock("@/lib/supabase/server",()=>({ getSupabaseAdminClient:()=>({ rpc:m.rpc }) }));
vi.mock("@/lib/google-drive/personal-drive",()=>({ DriveConnectionError:class extends Error {},isPersonalDriveConfigured:()=>m.configured,uploadPersonalEvidence:m.upload,removePersonalEvidence:m.remove }));
import { GET, POST } from "./route";
import { POST as analyze } from "./analyze/route";
const partyId="11111111-1111-4111-8111-111111111111", submissionId="22222222-2222-4222-8222-222222222222";
function request(report:unknown={},mime="image/png") {
  const form=new FormData();form.set("partyId",partyId);form.set("category",String((report as {category?:string}).category ?? "rc"));form.set("file",new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],"test.png",{ type:mime }));
  form.set("report",JSON.stringify({ submissionId,partyId,testDate:"2026-10-12",total:7,correct:5,rows:[],method:"manual",...(report as object) }));
  return new Request("https://app.test/api/quizzes/hackers",{ method:"POST",body:form });
}
beforeEach(()=>{
  vi.resetAllMocks();vi.stubEnv("GROQ_API_KEY","test-key");m.configured=true;m.filters=[];
  m.session.mockResolvedValue({ ok:true,data:{ user:{ id:"user" },supabase:{ from:(table:string)=>({ select(){return this;},eq(...args:unknown[]){m.filters.push(args);return this;},order(){return this;},limit:async()=>({data:[],error:null}),maybeSingle:table==="party_members"?m.member:m.report }) } } });
  m.member.mockResolvedValue({ data:{ user_id:"user" },error:null });m.report.mockResolvedValue({ data:null,error:null });
  m.upload.mockResolvedValue("new-file");m.remove.mockResolvedValue(undefined);
  m.rpc.mockResolvedValue({ data:{ id:submissionId,inserted:true,correct:5 },error:null });
  m.read.mockResolvedValue({ recognized:true,total:7,correct:5,rows:[] });m.limit.mockReturnValue(null);
});
afterEach(()=>vi.unstubAllEnvs());
describe("해커스 채점표 API",()=>{
  it("LC 저장은 LC 분류와 파일명으로 전달한다",async()=>{
    expect((await POST(request({category:"lc"}))).status).toBe(200);
    expect(m.rpc).toHaveBeenCalledWith("record_hackers_report",expect.objectContaining({p_category:"lc"}));
    expect(m.upload).toHaveBeenCalledWith(expect.objectContaining({fileName:expect.stringContaining("hackers-lc-")}));
  });
  it("조회에서 RC·LC 기록을 구분하고 잘못된 분류를 거절한다",async()=>{
    expect((await GET(new Request(`https://app.test/api/quizzes/hackers?partyId=${partyId}&category=lc`))).status).toBe(200);
    expect(m.filters).toContainEqual(["category","lc"]);
    expect((await GET(new Request(`https://app.test/api/quizzes/hackers?partyId=${partyId}&category=book`))).status).toBe(400);
  });
  it("LC 자동 읽기에 분류를 전달하고 잘못된 분류는 AI 호출 전에 거절한다",async()=>{
    expect((await analyze(request({category:"lc"}))).status).toBe(200);
    expect(m.read).toHaveBeenCalledWith(expect.any(Buffer),"image/png","lc");
    m.read.mockClear();expect((await analyze(request({category:"book"}))).status).toBe(400);
    expect((await POST(request({category:"book"}))).status).toBe(400);expect(m.read).not.toHaveBeenCalled();
  });
  it("세션 및 파티 권한을 검사한 후에만 읽거나 업로드한다",async()=>{
    m.session.mockResolvedValueOnce({ ok:false,response:Response.json({},{ status:401 }) });expect((await analyze(request())).status).toBe(401);
    m.member.mockResolvedValue({ data:null,error:null });expect((await analyze(request())).status).toBe(403);expect((await POST(request())).status).toBe(403);
    expect(m.read).not.toHaveBeenCalled();expect(m.upload).not.toHaveBeenCalled();
  });
  it("지원하지 않는 파일을 외부로 전송하지 않는다",async()=>{
    expect((await analyze(request({},"text/html"))).status).toBe(415);
    expect((await POST(request({},"text/html"))).status).toBe(415);expect(m.read).not.toHaveBeenCalled();expect(m.upload).not.toHaveBeenCalled();
  });
  it("읽기는 저장·인증을 수행하지 않고 분석 결과만 반환한다",async()=>{
    const res=await analyze(request());expect(res.status).toBe(200);expect((await res.json()).correct).toBe(5);
    expect(m.upload).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();
  });
  it("AI 오류를 숨기고 수동 입력 저장은 계속 허용한다",async()=>{
    m.read.mockRejectedValue(new Error("provider secret details"));const res=await analyze(request());expect(res.status).toBe(502);expect(await res.json()).toEqual({ error:"report_read_failed" });
    expect((await POST(request())).status).toBe(200);expect(m.upload).toHaveBeenCalledOnce();
  });
  it("모순된 결과는 업로드 전에 거절한다",async()=>{
    expect((await POST(request({ total:7,correct:8 }))).status).toBe(400);expect(m.upload).not.toHaveBeenCalled();
  });
  it("Drive 파일과 확인한 결과를 서버에서 저장한다",async()=>{
    expect((await POST(request())).status).toBe(200);expect(m.rpc).toHaveBeenCalledWith("record_hackers_report",expect.objectContaining({ p_category:"rc", p_user:"user",p_party:partyId,p_correct:5,p_file:"new-file",p_method:"manual" }));
    expect(m.read).not.toHaveBeenCalled();expect(m.remove).not.toHaveBeenCalled();
  });
  it("이미 저장된 요청을 재전송하면 파일을 다시 올리지 않는다",async()=>{
    m.report.mockResolvedValue({ data:{ id:submissionId,correct:5 },error:null });expect((await POST(request())).status).toBe(200);expect(m.upload).not.toHaveBeenCalled();
  });
  it("동시 중복 제출에서 사용되지 않은 파일을 정리한다",async()=>{
    m.rpc.mockResolvedValue({ data:{ id:submissionId,inserted:false,correct:5 },error:null });expect((await POST(request())).status).toBe(200);expect(m.remove).toHaveBeenCalledWith("user","new-file");
  });
  it("DB가 명확히 롤백한 업로드를 정리한다",async()=>{
    m.rpc.mockResolvedValue({ data:null,error:{ code:"23514",message:"invalid" } });expect((await POST(request())).status).toBe(500);expect(m.remove).toHaveBeenCalledWith("user","new-file");
  });
  it("RPC 응답이 유실됐지만 결과가 저장됐다면 성공을 반환하고 파일을 보존한다",async()=>{
    m.rpc.mockResolvedValue({ data:null,error:{ message:"network" } });m.report.mockResolvedValueOnce({ data:null,error:null }).mockResolvedValueOnce({ data:{ id:submissionId },error:null });
    expect((await POST(request())).status).toBe(200);expect(m.remove).not.toHaveBeenCalled();
  });
  it("Drive가 미설정이면 인증을 완료로 표시하지 않는다",async()=>{
    m.configured=false;expect((await POST(request())).status).toBe(503);expect(m.rpc).not.toHaveBeenCalled();
  });
});
