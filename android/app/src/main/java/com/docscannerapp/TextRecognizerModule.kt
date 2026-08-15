package com.docscannerapp

import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.android.gms.tasks.Tasks
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File

class TextRecognizerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TextRecognizer"

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    @ReactMethod
    fun recognizeText(imagePath: String, promise: Promise) {
        Thread {
            try {
                val cleanPath = imagePath.replace("file://", "")
                val bitmap = BitmapFactory.decodeFile(cleanPath)

                if (bitmap == null) {
                    promise.reject("IMAGE_ERROR", "Image load nahi ho payi: $cleanPath")
                    return@Thread
                }

                val inputImage = InputImage.fromBitmap(bitmap, 0)
                val visionText = Tasks.await(recognizer.process(inputImage))

                val result = Arguments.createMap()
                result.putString("fullText", visionText.text)

                // Block-by-block breakdown (paragraphs/sections)
                val blocksArray = Arguments.createArray()
                for (block in visionText.textBlocks) {
                    val blockMap = Arguments.createMap()
                    blockMap.putString("text", block.text)

                    val box = block.boundingBox
                    if (box != null) {
                        val boxMap = Arguments.createMap()
                        boxMap.putInt("left", box.left)
                        boxMap.putInt("top", box.top)
                        boxMap.putInt("width", box.width())
                        boxMap.putInt("height", box.height())
                        blockMap.putMap("bounds", boxMap)
                    }

                    blocksArray.pushMap(blockMap)
                }
                result.putArray("blocks", blocksArray)

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("RECOGNITION_ERROR", e.message, e)
            }
        }.start()
    }
}