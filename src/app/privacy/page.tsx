import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/features/legal/legal-document";

const retentionConfigured = Boolean(process.env.CRON_SECRET && process.env.SUPABASE_SECRET_KEY);
const recordRetention =
  "학습·소통 기록은 생성일부터 달력상 1년이 지난 후 다음 일일 정리 작업에서 삭제합니다. 질문·학습 기록을 삭제할 때 연결된 AI 대화·답글·반응·사진 연결 정보도 함께 삭제하므로 하위 기록은 1년보다 일찍 삭제될 수 있습니다.";

const overseasServices = [
  {
    name: "Groq LLC (GroqCloud)",
    contact: "privacy@groq.com",
    location: "미국 및 Groq·하위 처리업체가 운영하는 기타 국가에서 처리될 수 있습니다. Groq가 보관하는 고객 데이터는 미국 내 Google Cloud 저장소에 저장된다고 안내합니다. 요청별 추론 처리 국가의 세부 범위는 최종 확인 중입니다.",
    data: "질문 영역·본문, 이용자가 입력한 추가 프롬프트와 이전 AI 질문·답변. 채점표 자동 읽기를 요청한 경우 이용자가 기기에서 직접 선택한 채점표 이미지 전체를 전송합니다. 이미지 안에 표시된 개인정보도 포함될 수 있으므로 계정 정보·이름·이메일 등은 잘라낸 후 결과 표만 제출해 주세요. 앱의 계정 식별자·이메일·이름, Google 로그인 정보, Drive에서 조회한 사진과 파티원 댓글을 별도로 AI 요청에 첨부하지 않습니다. 이용자가 질문에 직접 적은 개인정보도 함께 전달될 수 있습니다.",
    purpose: "이용자가 요청한 토익 학습 질문의 AI 답변 생성·후속 대화, 일일 RC 연습 문제 생성 및 제출한 채점표의 문항별 결과·점수 읽기.",
    timing: "새 질문 등록 시 또는 AI에게 질문 버튼을 누를 때 암호화된 서버 간 API 통신으로 전송합니다. 일일 RC 문제를 처음 준비할 때에는 날짜와 출제 지침만 전송하며, 이용자의 계정 정보와 선택한 답은 전송하지 않습니다. 채점표의 Groq로 채점표 읽기 버튼을 누르면 기기에서 선택한 이미지가 전송됩니다. 원본 보고 직접 입력 기능은 Groq에 이미지를 전송하지 않습니다.",
    retention: "일반 추론 요청의 입력·출력은 기본적으로 보관하지 않지만, 시스템 안정성·오남용 조사 시 일시 기록되어 최대 30일(법적 보관 의무 시 더 길게) 보관될 수 있습니다. 이용량 메타데이터는 수집됩니다. 운영 조직의 Zero Data Retention 활성화 여부는 아직 확인되지 않았습니다. 앱의 AI 대화는 부모 질문의 1년 보관 기준에 따라 함께 삭제합니다.",
    source: "https://console.groq.com/docs/your-data",
    sourceLabel: "GroqCloud 데이터 처리·보관 안내",
  },
  {
    name: "Supabase Pte. Ltd.",
    contact: "privacy@supabase.com",
    location:
      "주 데이터베이스·인증·저장소와 백업: 인도 뭄바이(ap-south-1). 제공업체 안내상 운영 로그는 EU 데이터센터에서 처리되며, 미국 계열사의 지원·운영 과정에서 지역 외 처리가 발생할 수 있습니다. 세부 국가와 재위탁 범위는 최종 확인 중입니다.",
    data:
      "이메일, 계정 식별자, 인증 정보, 닉네임, 목표 점수, 파티 참가 내역, 학습·소통 기록, 사진 파일 식별 정보와 암호화된 Drive 연결 토큰. 기존 Supabase 저장소에 보관된 인증 사진이 있는 경우 해당 파일도 포함합니다.",
    purpose: "회원 인증, 파티 접근 권한 관리, 학습·소통 기록과 사진 연결 정보 저장.",
    timing: "가입·로그인, 기록 작성·조회 및 Drive 연결·해제 시 암호화된 네트워크 통신으로 전송합니다.",
    retention:
      "학습·소통 기록은 생성일부터 1년 경과 후 다음 일일 정리 작업에서 삭제하는 기준입니다. 계정·파티 설정은 계정 이용 종료 요청 처리 시까지 보관합니다. Drive 연결 토큰은 연결 해제 시 삭제합니다. 백업·로그에는 별도의 제공업체 보관 조건이 적용되며 구체적인 기간은 확인 중입니다.",
    source: "https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq",
    sourceLabel: "Supabase 처리 위치·보관 안내",
  },
  {
    name: "Vercel Inc.",
    contact: "privacy@vercel.com",
    location:
      "확인한 배포의 서버 실행 위치: 미국(iad1). 접속 전달망(CDN), 로그와 지원 처리 위치는 서버 실행 위치와 다를 수 있으며, 미국 외 처리 국가의 세부 범위는 최종 확인 중입니다.",
    data:
      "IP 주소, 브라우저·기기 및 요청 정보, 인증 쿠키, 접속·오류 로그와 요청 처리에 필요한 계정·학습 데이터. 사진 업로드·조회 시 사진 데이터가 앱 서버를 거쳐 전달됩니다.",
    purpose: "웹사이트 제공, 로그인과 API 요청 처리, 사진 전달, 장애 대응과 보안 관리.",
    timing: "웹사이트 접속 및 기능 이용 시 암호화된 네트워크 통신으로 전송합니다.",
    retention:
      "요청 데이터는 서비스 요청 처리에 사용합니다. 로그·서비스 생성 정보는 제공업체의 운영·보안 목적과 보관 정책에 따라 처리되며, 현재 요금제와 설정에 적용되는 구체적인 기간은 최종 확인 중입니다. 앱 기록의 1년 기준을 모든 Vercel 로그에 동일하게 적용하지 않습니다.",
    source: "https://vercel.com/legal/privacy-notice",
    sourceLabel: "Vercel 개인정보 처리 안내",
  },
  {
    name: "Google LLC",
    contact: "googlekrsupport@google.com",
    location:
      "Google은 전 세계 서버에서 정보를 처리한다고 안내합니다. 개인 Google 계정의 Drive 저장 위치를 앱에서 특정 국가로 고정하지 않으며, 이 서비스에 적용되는 구체적인 처리 국가 범위는 최종 확인 중입니다.",
    data:
      "Google 로그인·연결 요청 정보와 권한 승인 정보, 계정 식별자·이메일 등 인증 응답 정보, Drive 인증 사진의 내용·파일명·폴더 및 파일 식별 정보. Google과 앱 사이에서 인증 및 파일 데이터가 송수신됩니다.",
    purpose: "Google 계정 인증, 이용자 개인 Drive에 인증 사진 저장, 권한이 있는 파티원에게 앱 안에서 사진 제공.",
    timing: "Google 로그인, Drive 연결과 사진 업로드·조회 시 암호화된 네트워크 통신으로 전송합니다.",
    retention:
      "Drive 원본 사진은 이용자가 본인의 Drive에서 삭제할 때까지 보관될 수 있습니다. 앱의 연결 해제만으로 원본을 삭제하지 않습니다. Google 계정 정보와 삭제 후 백업 등의 보관은 Google 정책에 따르며, 앱 기록의 1년 기준과 구분됩니다.",
    source: "https://policies.google.com/privacy?hl=ko",
    sourceLabel: "Google 개인정보처리방침",
  },
];

export const metadata: Metadata = {
  title: "개인정보처리방침",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="개인정보처리방침">
      <p>
        새벽 토익은 계정 관리와 파티 기반 학습 서비스를 위해 아래 정보를
        처리합니다. 아래 기록 보관·삭제 기준은 운영 정책으로 정했으며, 일부
        외부 서비스의 세부 국외 처리 및 백업·로그 조건은 확인 중입니다.
      </p>
      <LegalSection title="1. 처리하는 정보와 목적">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            계정 정보: 이메일, 계정 식별자, 닉네임, 목표 점수 트랙. 로그인,
            사용자 식별, 파티 내 표시를 위해 처리합니다.
          </li>
          <li>
            Google 로그인 선택 시: Google 계정 식별 정보, 이메일, 이름과 프로필
            사진 주소. 계정 인증과 프로필 생성에 사용합니다.
          </li>
          <li>
            이메일 가입 시: 비밀번호를 인증 서비스인 Supabase Auth에 전달합니다.
            앱의 학습 데이터베이스에 평문 비밀번호를 저장하지 않습니다.
          </li>
          <li>
            학습·소통 정보: 파티 참가 내역, 인증 사진, 학습 날짜와 항목,
            점수·퀴즈 답안, 질문·답글, 채팅, 응원·독려 내역. 기록 저장과 파티
            활동 제공에 사용합니다.
          </li>
          <li>
            알림을 허용한 경우: 푸시 구독 주소와 암호화 키. 알림 전달에
            사용합니다.
          </li>
          <li>
            접속 과정의 정보: 인증 쿠키와 서버 접속·오류 로그. 로그인 유지와
            서비스 운영에 사용합니다.
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="2. 파티원에게 보이는 정보">
        <p>
          닉네임, 학습 인증 사진과 기록, 점수, 질문·답글, AI에게 보낸 추가 질문과 답변, 채팅 등 파티 활동
          정보는 같은 파티의 구성원에게 표시됩니다. 초대 링크를 가진 사람은 참가
          전에 파티 이름, 초대한 운영자의 닉네임과 정원 정보를 볼 수 있습니다.
          사진에는 타인의 개인정보나 공개하고 싶지 않은 내용을 포함하지 마세요.
        </p>
      </LegalSection>
      <LegalSection title="3. 외부 서비스 이용 및 국외 처리">
        <p>
          웹 서비스 제공에는 Vercel, 인증·학습 데이터 저장에는 Supabase, Google
          로그인과 개인 Drive 사진 저장에는 Google을 사용합니다. 이들 서비스의
          서버에서 정보가 처리될 수 있습니다. 아래는 2026년 10월 11일에 확인한
          설정과 제공업체 공개 안내를 바탕으로 작성한 내용입니다. 확인 중인
          국가·보관기간, 계약 조건과 국외 이전의 법적 근거는 추가 확인 후
          갱신할 예정입니다.
        </p>
        {overseasServices.map((service) => (
          <section key={service.name} className="card space-y-3 p-5">
            <h3 className="text-title">{service.name}</h3>
            <dl className="space-y-3">
              {[
                ["처리 국가·위치", service.location],
                ["처리 항목", service.data],
                ["이용 목적", service.purpose],
                ["이전 시기·방법", service.timing],
                ["보유·이용 기간", service.retention],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div>
                <dt className="font-semibold">제공업체 문의처</dt>
                <dd>
                  <a href={`mailto:${service.contact}`} className="break-all text-accent">
                    {service.contact}
                  </a>
                </dd>
              </div>
            </dl>
            <a href={service.source} className="text-accent">
              {service.sourceLabel}
            </a>
          </section>
        ))}
        <h3 className="text-title">개인 Drive의 접근 범위</h3>
        <p>
          사진 인증을 사용하려면 본인의 Google Drive 연결에 동의해야 합니다.
          앱이 생성하거나 이용자가 이 앱에 사용을 허용한 파일에 접근하는
          drive.file 권한을 요청합니다. Drive 전체 파일에 대한 접근 권한을
          요청하지 않으며, 연결 토큰은
          사용자별로 암호화해 서버에 보관합니다. 파티원이 사진을 조회하면 서버가
          파티 접근 권한을 확인한 후 업로더의 Drive에서 사진을 읽어 전달합니다.
          연결 해제 시 저장된 토큰을 삭제하고 앱의 사진 조회를 중단하지만, Drive
          원본 파일은 자동으로 삭제하지 않습니다.
        </p>
        <h3 className="text-title">이전을 거부하거나 연결을 해제하는 방법</h3>
        <p>
          Google 로그인 대신 이메일 가입·로그인을 선택할 수 있습니다.
          Drive 연결 승인 화면에서 승인을 거부하거나 앱의 Drive 연결 해제
          기능을 사용할 수 있으며, Google 계정의 보안 설정에서도 앱의 접근
          권한을 철회할 수 있습니다. Drive를 연결하지 않거나 권한을 철회하면
          새 사진 업로드가 제한되고, 업로더의 연결 상태에 따라 기존 사진의
          앱 내 조회도 제한됩니다. 연결 해제만으로 이미 저장된 학습 기록이나
          Drive 원본 사진이 삭제되지는 않습니다.
        </p>
        <p>
          Vercel과 Supabase를 통한 처리는 현재 서비스의 웹 접속·회원 인증·기록
          저장에 필요합니다. 이 처리를 원하지 않으면 회원가입과 서비스 이용을
          중단하고, 기존 계정과 기록의 삭제는 운영자 이메일로 요청할 수
          있습니다. 삭제 요청은 본인 확인 후 처리하며, 제공업체 백업·로그의
          삭제 시점은 별도로 확인합니다.
        </p>
        <p>
          AI 질문 기능을 사용하면 질문과 이전 AI 대화가 GroqCloud에 전달됩니다. 이 처리를 원하지 않으면 질문 등록 및 AI에게 질문 기능을 사용하지 않아야 합니다. 기존 질문 열람과 파티원 댓글 작성은 AI 요청을 발생시키지 않습니다. AI 대화 기록은 같은 파티원에게 표시되며 질문 삭제 시 함께 삭제합니다. 일일 RC 연습 문제 생성에는 날짜와 출제 지침만 전송합니다. RC 문제와 풀이 결과는 문제 세트 생성일부터 1년이 지난 후 일일 정리 작업에서 함께 삭제합니다. 해커스 채점표 자동 읽기를 요청하면 직접 선택한 이미지가 Groq로 전송됩니다. 저장 전 읽은 값을 확인·수정할 수 있으며 결과와 원본 채점표는 같은 파티원이 볼 수 있습니다. 채점표 결과와 사진 연결 정보는 제출 학습 기록의 1년 보관 기준으로 함께 삭제하고, 개인 Drive의 원본은 이용자가 삭제할 때까지 남을 수 있습니다.
        </p>
        <h3 className="text-title">Google 데이터의 사용 제한</h3>
        <p>
          Google에서 받은 계정 정보와 Drive 파일은 계정 인증, 인증 사진의
          저장·조회 및 이용자가 선택한 파티 내 공유 기능을 제공하는 데
          사용합니다. Google 데이터를 판매하거나 광고·신용평가 목적으로
          이용하지 않으며, 범용 AI 모델의 학습 데이터로 사용하지 않습니다.
          Groq에 Google 로그인 정보나 Drive API로 조회한 사진을 전달하지
          않습니다. 채점표 자동 읽기는 이용자가 기기에서 별도로 선택해 분석을 요청한 이미지에만 적용됩니다. 사진을 업로드하면 같은 파티원이 해당 사진을 볼 수 있으므로
          공유 범위를 확인한 뒤 업로드해 주세요.
        </p>
        <p>
          서비스 제공에 필요한 위 외부 서비스 처리와 파티 내 공유 외에는
          이용자의 동의 또는 법령상 근거 없이 Google 데이터를 이전하지
          않습니다. 운영자의 열람은 이용자의 명시적 동의가 있거나 보안 문제
          해결·법적 의무 이행에 필요한 경우로 제한합니다. Google API로 받은
          정보의 사용과 다른 앱으로의 이전은 Limited Use 요건을 포함한{" "}
          <a className="text-accent" href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>
          를 준수합니다.
        </p>
        <p className="text-meta text-muted">
          참고: <a className="text-accent" href="https://policies.google.com/technologies/retention?hl=ko">Google 데이터 보관 안내</a>,{" "}
          <a className="text-accent" href="https://supabase.com/legal/customer-resources/subprocessor-list">Supabase 재위탁 업체 안내</a>,{" "}
          <a className="text-accent" href="https://vercel.com/legal/sub-processors">Vercel 재위탁 업체 안내</a>.
          제공업체 정책 링크는 이 문서의 서비스별 고지를 보완하기 위한 자료입니다.
        </p>
      </LegalSection>
      <LegalSection title="4. 보관 및 삭제">
        <p>{recordRetention}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            정리 대상: 학습 기록과 사진 연결 정보, 점수·퀴즈 응시 및 답안,
            질문·답글, 채팅, 반응·독려, 개인 단어 기록과 활동 알림.
          </li>
          <li>
            유지 대상: 계정·파티 참가 및 설정, 학습 목표, 공용 학습 자료.
            계정 정보는 계정 이용 종료 요청 처리 시까지 보관합니다.
          </li>
          <li>
            Drive 연결 토큰은 연결 해제 시 삭제합니다. 재연결 확인에 사용하는
            Google 계정 식별 정보와 폴더 정보는 계정 이용 종료 요청 처리 시까지
            보관합니다. 개인 Drive의 원본 사진은 자동 삭제하지 않으며,
            이용자가 본인의 Drive에서 직접 삭제할 수 있습니다.
          </li>
          <li>
            기존 Supabase 저장소 사진은 앱 기록 삭제 후 파일 정리를 진행하며,
            실패한 파일 정리는 다음 일일 작업에서 다시 시도합니다. 제공업체
            백업·로그의 보관과 삭제 시점은 원본 DB의 삭제 시점과 다를 수 있습니다.
          </li>
        </ul>
        <p role="note" className="text-meta text-muted">
          {retentionConfigured
            ? "일일 자동 정리를 운영하도록 설정했습니다. 장애 시 재시도하며, 삭제를 원하는 이용자는 아래 문의처로 요청할 수 있습니다."
            : "일일 자동 정리 기능은 운영 활성화 준비 중입니다. 활성화 전에는 만료 기록이 남아 있을 수 있으며, 삭제를 원하는 이용자는 아래 문의처로 요청해 주세요."}
        </p>
        <p>
          개인정보 열람·정정·삭제와 계정 이용 종료는 아래 운영자 이메일로
          요청할 수 있습니다. 본인 확인 후 계정에 연결된 개인정보와 학습·소통
          기록을 정리하며, 파티 운영자라면 파티 소유권 정리도 함께 처리합니다.
          앱에서 삭제한 기록은 일반 화면에서 복구할 수 없습니다. 개인 Drive
          원본과 제공업체 백업·로그는 위에 안내한 별도 기준을 따릅니다.
        </p>
      </LegalSection>
      <LegalSection title="5. 이용자의 요청 및 보호 조치">
        <p>
          이용자는 자신의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다.
          운영자는 본인 확인 후 요청 범위와 관련 의무를 확인해 처리합니다. 앱은
          파티별 접근 권한을 적용하고 인증 사진을 비공개 저장소에서 제공하며,
          로그인 세션은 인증 쿠키로 관리합니다.
        </p>
      </LegalSection>
      <LegalSection title="6. 쿠키와 기기 저장소">
        <p>
          로그인 유지, 선택한 파티, 화면 테마와 설치 안내 상태 등을 위해 쿠키
          또는 기기 저장소를 사용합니다. 브라우저 설정에서 삭제하거나 차단할 수
          있으며, 차단 시 로그인 등 일부 기능이 제한될 수 있습니다.
        </p>
      </LegalSection>
      <LegalSection title="7. 변경 안내">
        <p>
          처리 목적, 항목, 외부 서비스나 보유기간이 변경되면 이 페이지의 내용과
          적용일을 갱신하고 필요한 안내를 제공합니다.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
