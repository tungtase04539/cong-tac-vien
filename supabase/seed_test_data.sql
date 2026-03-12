-- ============================================
-- SEED DATA — Test kịch bản hệ thống
-- Chạy trong Supabase SQL Editor
-- ============================================

-- ============================================
-- BƯỚC 1: Tạo sample tasks (20 tasks đa dạng)
-- ============================================

-- Lấy admin user id
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'anhtung032004@gmail.com' LIMIT 1;

  -- === BÀI NGẮN (short) - 4 điểm ===
  INSERT INTO tasks (title, description, source_url, difficulty, points, status, created_by) VALUES
  ('Giới thiệu GPT-4o Mini', 'Dịch bài giới thiệu GPT-4o Mini từ OpenAI blog', 'https://openai.com/blog/gpt-4o-mini', 'short', 4, 'new', admin_id),
  ('Prompt Engineering cơ bản', 'Dịch hướng dẫn prompt engineering cho người mới', 'https://waytoagi.com/prompt-basics', 'short', 4, 'new', admin_id),
  ('AI Agent là gì?', 'Dịch bài giải thích khái niệm AI Agent', 'https://waytoagi.com/ai-agent-intro', 'short', 4, 'new', admin_id),
  ('Fine-tuning 101', 'Dịch hướng dẫn fine-tuning cơ bản', 'https://waytoagi.com/fine-tuning-101', 'short', 4, 'new', admin_id),
  ('Embeddings giải thích đơn giản', 'Dịch bài giải thích embeddings cho người mới', 'https://waytoagi.com/embeddings-explained', 'short', 4, 'new', admin_id);

  -- === BÀI TRUNG BÌNH (medium) - 8 điểm ===
  INSERT INTO tasks (title, description, source_url, difficulty, points, status, created_by) VALUES
  ('Hướng dẫn RAG toàn diện', 'Dịch bài hướng dẫn xây dựng hệ thống RAG', 'https://waytoagi.com/rag-guide', 'medium', 8, 'new', admin_id),
  ('So sánh LLM 2024', 'Dịch bài so sánh các LLM phổ biến năm 2024', 'https://waytoagi.com/llm-comparison', 'medium', 8, 'new', admin_id),
  ('LangChain cơ bản', 'Dịch tutorial LangChain cho người mới bắt đầu', 'https://github.com/langchain/docs', 'medium', 8, 'new', admin_id),
  ('Vector Database là gì?', 'Dịch bài tổng hợp về Vector Database', 'https://waytoagi.com/vector-db', 'medium', 8, 'new', admin_id),
  ('Hugging Face Transformers Guide', 'Dịch hướng dẫn sử dụng Hugging Face', 'https://huggingface.co/docs', 'medium', 8, 'new', admin_id),
  ('Multi-modal AI tổng hợp', 'Dịch bài về xu hướng Multi-modal AI', 'https://waytoagi.com/multimodal', 'medium', 8, 'new', admin_id),
  ('AutoGPT và AI Autonomous', 'Dịch bài phân tích AutoGPT và hệ thống AI tự chủ', 'https://waytoagi.com/autogpt', 'medium', 8, 'new', admin_id);

  -- === BÀI DÀI (long) - 12 điểm ===
  INSERT INTO tasks (title, description, source_url, difficulty, points, status, created_by) VALUES
  ('Transformer Architecture Deep Dive', 'Dịch bài phân tích kiến trúc Transformer chuyên sâu', 'https://waytoagi.com/transformer-deep', 'long', 12, 'new', admin_id),
  ('Xây dựng Chatbot với LLM', 'Dịch tutorial xây dựng chatbot từ đầu đến cuối', 'https://waytoagi.com/chatbot-tutorial', 'long', 12, 'new', admin_id),
  ('AI Safety và Alignment', 'Dịch bài nghiên cứu về AI Safety', 'https://waytoagi.com/ai-safety', 'long', 12, 'new', admin_id),
  ('Reinforcement Learning from Human Feedback', 'Dịch bài tổng hợp về RLHF', 'https://waytoagi.com/rlhf', 'long', 12, 'new', admin_id);

  -- === BÀI PHỨC TẠP (complex) - 15 điểm ===
  INSERT INTO tasks (title, description, source_url, difficulty, points, status, created_by) VALUES
  ('GPT-4 Technical Report', 'Dịch báo cáo kỹ thuật GPT-4 của OpenAI', 'https://arxiv.org/abs/2303.08774', 'complex', 15, 'new', admin_id),
  ('Attention Is All You Need', 'Dịch paper gốc về Transformer', 'https://arxiv.org/abs/1706.03762', 'complex', 15, 'new', admin_id),
  ('LLM Inference Optimization', 'Dịch bài tổng hợp kỹ thuật tối ưu inference LLM', 'https://waytoagi.com/llm-optimization', 'complex', 15, 'new', admin_id);

  RAISE NOTICE 'Inserted 20 tasks successfully!';
END $$;

-- ============================================
-- BƯỚC 2: Sau khi tạo tài khoản test,
-- chạy SQL bên dưới để gán role
-- ============================================

-- Thay email thật của các tài khoản test vào đây:

-- UPDATE profiles SET role = 'scout' WHERE email = 'scout@test.com';
-- UPDATE profiles SET role = 'localizer' WHERE email = 'localizer@test.com';
-- UPDATE profiles SET role = 'qa' WHERE email = 'qa@test.com';
