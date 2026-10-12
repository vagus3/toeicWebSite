-- 채팅의 @AI 답변 메시지 종류.
-- 새 enum 값은 이 트랜잭션이 커밋되기 전에는 쓸 수 없어서, 이 값을 쓰는 정책·제약은 다음 마이그레이션에 둔다.
alter type public.chat_message_type add value if not exists 'ai';
