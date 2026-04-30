from pathlib import Path

from chatBot.utils import rebuild_vector_store


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "data"
    vectorstore_dir = base_dir.parent / "bylaws_vector_index"
    rebuild_vector_store(folder_path=data_dir, vectorstore_path=vectorstore_dir)
   # print("FAISS index rebuilt successfully.")
